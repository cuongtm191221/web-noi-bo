from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx
import os
import traceback
import asyncio
import logging
from datetime import datetime

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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Rikkei AI Pipeline", version="0.1.0")

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://ollama:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
STORAGE_URL = os.environ.get("STORAGE_URL", "http://web:3000")
UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "/uploads")

# Timeout for each Ollama call (5 minutes)
OLLAMA_TIMEOUT = 300

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


async def _safe_update_status(document_id: str, status: str):
    """Update status with error handling."""
    try:
        await update_document_status(document_id, status)
        logger.info(f"[{document_id}] status -> {status}")
    except Exception as e:
        logger.error(f"[{document_id}] status update failed ({status}): {e}")


async def _process_pipeline(document_id: str, storage_path: str, format: str):
    """The actual AI pipeline with per-step error isolation."""
    start = datetime.now()
    logger.info(f"[{document_id}] START pipeline format={format}")

    try:
        # 1. Read file from shared volume
        filename = os.path.basename(storage_path)
        file_path = os.path.join(UPLOADS_DIR, filename)
        logger.info(f"[{document_id}] step=reading file={file_path}")
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        logger.info(f"[{document_id}] file read ok size={len(file_bytes)}")

        # 2. Parse
        logger.info(f"[{document_id}] step=parsing")
        parser = PARSER_MAP[format]
        doc = parser(file_bytes)

        if doc.total_chars() == 0:
            logger.warning(f"[{document_id}] empty document (likely PDF scan)")
            await _safe_update_status(document_id, "draft")
            return

        logger.info(f"[{document_id}] parsed ok total_chars={doc.total_chars()}")

        # 3. Chunk
        logger.info(f"[{document_id}] step=chunking")
        chunks = chunk_document(doc)
        await save_chunks(document_id, chunks)
        logger.info(f"[{document_id}] saved {len(chunks)} chunks")

        # 4. Summarize (Ollama)
        logger.info(f"[{document_id}] step=summarizing (may take 1-3 min)")
        summary = None
        try:
            summary = await asyncio.wait_for(
                summarize_chunks(chunks, OLLAMA_HOST, OLLAMA_MODEL),
                timeout=OLLAMA_TIMEOUT,
            )
            await save_summary(document_id, summary, OLLAMA_MODEL)
            logger.info(f"[{document_id}] summary saved")
        except (asyncio.TimeoutError, Exception) as e:
            logger.error(f"[{document_id}] summarize failed: {e}")
            traceback.print_exc()
            await _safe_update_status(document_id, "draft")
            return

        # 5. Citations (best-effort — independent of summary save)
        try:
            await save_citations(document_id, summary.get("citations", []))
            logger.info(f"[{document_id}] citations saved")
        except Exception as e:
            logger.error(f"[{document_id}] citations failed: {e}")
            traceback.print_exc()

        # 6. Flowchart (best-effort)
        try:
            logger.info(f"[{document_id}] step=flowchart (may take 1-3 min)")
            mermaid = await asyncio.wait_for(
                generate_flowchart(chunks, OLLAMA_HOST, OLLAMA_MODEL),
                timeout=OLLAMA_TIMEOUT,
            )
            if mermaid:
                await save_flowchart(document_id, mermaid)
                logger.info(f"[{document_id}] flowchart saved")
            else:
                logger.warning(f"[{document_id}] flowchart empty (model returned nothing)")
        except (asyncio.TimeoutError, Exception) as e:
            logger.error(f"[{document_id}] flowchart failed: {e}")
            traceback.print_exc()

        # 7. Mark published (we have at least summary + chunks)
        await _safe_update_status(document_id, "published")

        elapsed = (datetime.now() - start).total_seconds()
        logger.info(f"[{document_id}] DONE in {elapsed:.1f}s")

    except Exception as e:
        logger.error(f"[{document_id}] PIPELINE FAILED: {e}")
        traceback.print_exc()
        await _safe_update_status(document_id, "draft")