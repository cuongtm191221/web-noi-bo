from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx
import os

from parsers import parse_pdf, parse_docx, parse_pptx, parse_xlsx, parse_md
from chunker import chunk_document
from summarizer import summarize_chunks
from flowchart_gen import generate_flowchart
from db import (
    save_chunks,
    save_summary,
    save_flowchart,
    save_citations,
    update_document_status,
)

app = FastAPI(title="Rikkei AI Pipeline", version="0.1.0")

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
STORAGE_URL = os.environ.get("STORAGE_URL", "http://web:3000")

PARSER_MAP = {
    "pdf": parse_pdf,
    "docx": parse_docx,
    "pptx": parse_pptx,
    "xlsx": parse_xlsx,
    "md": parse_md,
    "txt": parse_md,
}


@app.get("/health")
async def health():
    return {"status": "ok"}


class ProcessRequest(BaseModel):
    document_id: str
    storage_path: str
    format: str


@app.post("/process")
async def process_document(req: ProcessRequest, background_tasks: BackgroundTasks):
    """Kick off AI processing for a document."""
    if req.format not in PARSER_MAP:
        raise HTTPException(400, f"Unsupported format: {req.format}")

    background_tasks.add_task(
        _process_pipeline,
        req.document_id,
        req.storage_path,
        req.format,
    )
    return {"status": "processing", "document_id": req.document_id}


async def _process_pipeline(document_id: str, storage_path: str, format: str):
    """The actual AI pipeline."""
    try:
        # 1. Download file from Next.js storage
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{STORAGE_URL}/api/documents/{document_id}/download",
            )
            response.raise_for_status()
            file_bytes = response.content

        # 2. Parse
        parser = PARSER_MAP[format]
        doc = parser(file_bytes)

        if doc.total_chars() == 0:
            # Empty document - mark as archived
            await update_document_status(document_id, "archived")
            return

        # 3. Chunk
        chunks = chunk_document(doc)
        await save_chunks(document_id, chunks)

        # 4. Summarize (Ollama)
        summary = await summarize_chunks(chunks, OLLAMA_HOST, OLLAMA_MODEL)
        await save_summary(document_id, summary, OLLAMA_MODEL)

        # 5. Citations
        await save_citations(document_id, summary.get("citations", []))

        # 6. Flowchart (Ollama)
        mermaid = await generate_flowchart(chunks, OLLAMA_HOST, OLLAMA_MODEL)
        if mermaid:
            await save_flowchart(document_id, mermaid)

        # 7. Mark published
        await update_document_status(document_id, "published")

    except Exception as e:
        print(f"Processing failed for {document_id}: {e}")
        # Keep as draft for retry
        try:
            await update_document_status(document_id, "draft")
        except Exception:
            pass