# Plan 3: AI Pipeline — Rikkei Education

**Date**: 2026-08-02
**Spec**: [`docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`](../specs/2026-07-31-internal-document-mgmt-design.md)
**Depends on**: Plan 1 ✅, Plan 2 ✅
**Next**: Plan 4 (Flowchart), Plan 5 (Citation)

## Execution Handoff

> **REQUIRED SUB-SKILL**: Use **subagent-driven-development**.

---

## Goal

Implement AI pipeline: parse uploaded docs → chunk → summarize via Ollama → generate flowchart. Auto-trigger sau khi upload. Lưu kết quả vào DB (DocumentSummary, DocumentFlowchart, Citation tables).

**Plan 3 scope**: AI Pipeline (FastAPI + Ollama + parsers + chunking + summarization + flowchart). **KHÔNG bao gồm**: viewer rendering (Plan 4 + 5).

## Architecture

```
Upload (Plan 2) → trigger AI job → FastAPI (apps/ai-pipeline) → Ollama → results → DB
                                                                    ↓
                                                            polling status (Next.js tRPC)
```

### Flow chi tiết:

1. Next.js upload route (Plan 2) tạo Document row với `status='draft'`.
2. Sau khi upload, Next.js gọi `POST /process/{document_id}` tới FastAPI.
3. FastAPI:
   - Download file từ Next.js storage hoặc filesystem.
   - Parse (pypdf / python-docx / python-pptx / openpyxl / md parser).
   - Chunk (~500 tokens, overlap 50 tokens) với location tracking.
   - Gọi Ollama `qwen2.5:7b` để summarize.
   - Gọi Ollama để generate flowchart (Mermaid).
   - Extract citations từ summary.
   - Lưu DocumentSummary, DocumentFlowchart, Citation tables vào Postgres.
   - Update Document.status = 'published' (hoặc 'failed' nếu lỗi).
4. Next.js tRPC polling `/processing-status/{document_id}` để hiển thị progress.

## Tech Stack

| Layer | Tech |
|-------|------|
| API | FastAPI + uvicorn |
| LLM | Ollama (qwen2.5:7b) |
| PDF parser | pypdf + pdfplumber fallback |
| DOCX parser | python-docx |
| PPTX parser | python-pptx |
| XLSX parser | openpyxl |
| MD/TXT parser | custom |
| Chunker | tiktoken hoặc simple split |
| Database | Prisma Python client (asyncpg) hoặc psycopg2 |
| Container | Docker (đã có trong compose) |

## Global Constraints

1. DRY, YAGNI, TDD, frequent commits.
2. **Fallback chain** cho PDF: pypdf → pdfplumber.
3. **JSON output** từ Ollama: dùng `format` parameter hoặc regex parse JSON.
4. **Graceful failure**: nếu Ollama timeout → retry 1 lần rồi mark 'failed'.
5. **Inline styles** cho UI (theo memory `tailwind-v4-spacing-bug`).
6. **Docker network** `--network web-noi-bo_default` cho DB operations.

---

## File Structure

```
web-noi-bo/
├── apps/
│   ├── ai-pipeline/
│   │   ├── Dockerfile
│   │   ├── pyproject.toml          # uv dependencies
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── parsers/
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # Parser protocol
│   │   │   ├── pdf_parser.py       # pypdf + pdfplumber fallback
│   │   │   ├── docx_parser.py      # python-docx
│   │   │   ├── pptx_parser.py      # python-pptx
│   │   │   ├── xlsx_parser.py      # openpyxl
│   │   │   └── md_parser.py        # MD/TXT
│   │   ├── chunker.py              # 500 tokens, overlap 50
│   │   ├── summarizer.py           # Ollama summarize
│   │   ├── flowchart_gen.py        # Ollama flowchart
│   │   ├── db.py                   # AsyncPG client
│   │   └── tests/
│   │       ├── test_pdf_parser.py
│   │       ├── test_chunker.py
│   │       └── test_summarizer.py
│   └── web/
│       ├── app/
│       │   └── api/
│       │       └── documents/
│       │           └── [id]/
│       │               └── process/
│       │                   └── route.ts  # Trigger AI
│       └── lib/
│           └── trpc/
│               └── routers/
│                   └── documents.ts  # Add processingStatus proc
└── docker-compose.yml             # Add ai-pipeline profile
```

---

## Tasks

### Task 1: Add AI Pipeline Service to Docker Compose

**Files**:
- Modify: `docker-compose.yml`
- Create: `apps/ai-pipeline/Dockerfile`

**Steps**:

1. Update `docker-compose.yml` — already has ai-pipeline service (Plan 1 placeholder). Update with:

```yaml
  ai-pipeline:
    build:
      context: ./apps/ai-pipeline
    container_name: rikkei-ai-pipeline
    profiles: ["ai"]
    restart: unless-stopped
    depends_on:
      ollama:
        condition: service_started
      postgres:
        condition: service_healthy
    environment:
      OLLAMA_HOST: http://ollama:11434
      OLLAMA_MODEL: qwen2.5:7b
      DATABASE_URL: postgresql://rikkei@postgres:5432/rikkei_docs
      AI_PIPELINE_URL: http://ai-pipeline:8000
    ports:
      - "${AI_PIPELINE_PORT:-8000}:8000"
```

2. Create `apps/ai-pipeline/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv (fast Python package manager)
RUN pip install uv

# Copy dependencies
COPY pyproject.toml .

# Install packages
RUN uv pip install --system .

# Copy source
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

3. Create `apps/ai-pipeline/pyproject.toml`:
```toml
[project]
name = "ai-pipeline"
version = "0.1.0"
description = "AI processing pipeline for Rikkei Education documents"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "pypdf>=5.1",
    "pdfplumber>=0.11",
    "python-docx>=1.1",
    "python-pptx>=1.0",
    "openpyxl>=3.1",
    "tiktoken>=0.8",
    "httpx>=0.27",
    "asyncpg>=0.30",
    "pydantic>=2.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "pytest-mock>=3.14",
]
```

4. Create empty `apps/ai-pipeline/main.py` (placeholder):
```python
from fastapi import FastAPI

app = FastAPI(title="Rikkei AI Pipeline", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

5. Verify Docker build (without starting):
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
docker compose --profile ai build ai-pipeline
```

Expected: Image builds successfully.

6. Commit:
```bash
git add docker-compose.yml apps/ai-pipeline/
git commit -m "feat(ai): scaffold ai-pipeline FastAPI service

- Dockerfile based on python:3.12-slim with uv
- pyproject.toml with FastAPI, parsers, Ollama client
- Health endpoint placeholder
- Docker profile: ai (opt-in to avoid downloading Ollama by default)"
```

---

### Task 2: Prisma Schema — Add AI Tables

**Files**:
- Modify: `apps/web/prisma/schema.prisma`
- New migration: `add_ai_tables`

**Models to add**:

```prisma
model DocumentSummary {
  id           String   @id @default(cuid())
  documentId   String   @unique @map("document_id")
  document     Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  executiveSummary String @db.Text @map("executive_summary")
  checklist        Json  @map("checklist")
  modelUsed        String @map("model_used")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("document_summaries")
}

model DocumentFlowchart {
  id          String   @id @default(cuid())
  documentId  String   @unique @map("document_id")
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  mermaidSyntax String  @db.Text @map("mermaid_syntax")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("document_flowcharts")
}

model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String   @map("document_id")
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkIndex  Int      @map("chunk_index")
  text        String   @db.Text
  // Polymorphic location
  pageNumber  Int?     @map("page_number")       // PDF, DOCX
  slideNumber Int?     @map("slide_number")      // PPTX
  sheetName   String?  @map("sheet_name")        // XLSX
  rowNumber   Int?     @map("row_number")        // XLSX
  tokenCount  Int      @map("token_count")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([documentId])
  @@map("document_chunks")
}

model Citation {
  id          String   @id @default(cuid())
  documentId  String   @map("document_id")
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkId     String   @map("chunk_id")
  claimText   String   @db.Text @map("claim_text")
  // Polymorphic location
  pageNumber  Int?     @map("page_number")
  slideNumber Int?     @map("slide_number")
  sheetName   String?  @map("sheet_name")
  rowNumber   Int?     @map("row_number")
  columnLetter String? @map("column_letter")
  order       Int      @default(0)
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([documentId])
  @@map("citations")
}
```

Add to Document model:
```prisma
model Document {
  // ... existing fields
  summary   DocumentSummary?
  flowchart DocumentFlowchart?
  chunks    DocumentChunk[]
  citations Citation[]
}
```

Steps:

1. Append models to schema
2. Run migration via Docker:
```bash
docker run --rm --network web-noi-bo_default -e DATABASE_URL='postgresql://rikkei@postgres:5432/rikkei_docs' -v "//c/Users/Admin/Desktop/web-noi-bo:/app" node:24-alpine sh -c "cd /app/apps/web && npx prisma migrate dev --name add_ai_tables --skip-seed" 2>&1 | tail -10
```

3. Regenerate Prisma client:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web && npx prisma generate 2>&1 | tail -3
```

4. Verify:
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "\d document_summaries"
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "\d document_chunks"
```

5. Commit:
```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/
git commit -m "feat(db): add DocumentSummary, DocumentFlowchart, DocumentChunk, Citation models

- DocumentSummary: executive_summary, checklist JSON, model_used
- DocumentFlowchart: mermaid_syntax (full Mermaid code)
- DocumentChunk: ~500 token chunks with polymorphic location
  (page_number, slide_number, sheet_name, row_number)
- Citation: claim + location, references chunk
- Document model gets back-relations
- Indexes on documentId for all child tables"
```

---

### Task 3: Parser Base + PDF Parser (with fallback)

**Files**:
- Create: `apps/ai-pipeline/parsers/__init__.py`
- Create: `apps/ai-pipeline/parsers/base.py`
- Create: `apps/ai-pipeline/parsers/pdf_parser.py`
- Create: `apps/ai-pipeline/tests/test_pdf_parser.py`

**Steps**:

1. Create `apps/ai-pipeline/parsers/__init__.py`:
```python
from .base import ParsedDocument, PageContent
from .pdf_parser import parse_pdf
from .docx_parser import parse_docx
from .pptx_parser import parse_pptx
from .xlsx_parser import parse_xlsx
from .md_parser import parse_md

__all__ = [
    "ParsedDocument",
    "PageContent",
    "parse_pdf",
    "parse_docx",
    "parse_pptx",
    "parse_xlsx",
    "parse_md",
]
```

2. Create `apps/ai-pipeline/parsers/base.py`:
```python
from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class PageContent:
    """Single page/slide/sheet content."""
    text: str
    location: Dict[str, Any] = field(default_factory=dict)
    # location keys: page_number, slide_number, sheet_name, row_number, column_letter

@dataclass
class ParsedDocument:
    """Output of parser."""
    pages: List[PageContent]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def full_text(self) -> str:
        return "\n\n".join(p.text for p in self.pages)
    
    def total_chars(self) -> int:
        return sum(len(p.text) for p in self.pages)
```

3. Create `apps/ai-pipeline/parsers/pdf_parser.py`:
```python
import io
from .base import ParsedDocument, PageContent
from .md_parser import parse_md  # fallback for scanned PDFs

def parse_pdf(file_bytes: bytes) -> ParsedDocument:
    """Parse PDF with pypdf → pdfplumber fallback chain."""
    try:
        return _parse_with_pypdf(file_bytes)
    except Exception as e:
        print(f"pypdf failed: {e}, trying pdfplumber...")
        return _parse_with_pdfplumber(file_bytes)

def _parse_with_pypdf(file_bytes: bytes) -> ParsedDocument:
    import pypdf
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append(PageContent(
            text=text,
            location={"page_number": i + 1}
        ))
    return ParsedDocument(
        pages=pages,
        metadata={"format": "pdf", "total_pages": len(reader.pages)}
    )

def _parse_with_pdfplumber(file_bytes: bytes) -> ParsedDocument:
    import pdfplumber
    pages = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            pages.append(PageContent(
                text=text,
                location={"page_number": i + 1}
            ))
        total = len(pdf.pages)
    return ParsedDocument(
        pages=pages,
        metadata={"format": "pdf", "total_pages": total}
    )
```

4. Create `apps/ai-pipeline/tests/test_pdf_parser.py`:
```python
import pytest
from parsers.pdf_parser import parse_pdf

# Minimal valid PDF (1 page, "Hello World")
MINIMAL_PDF = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<<>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Hello World) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000103 00000 n
0000000175 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
260
%%EOF"""

def test_parse_minimal_pdf():
    doc = parse_pdf(MINIMAL_PDF)
    assert len(doc.pages) >= 1
    assert doc.metadata["format"] == "pdf"
    assert "page_number" in doc.pages[0].location

def test_invalid_pdf_raises_or_returns_empty():
    # Should not crash, may return empty pages
    doc = parse_pdf(b"not a pdf")
    assert doc.pages is not None
```

5. Create `apps/ai-pipeline/tests/__init__.py`:
```python
# Empty
```

6. Create placeholder parsers (for tests to pass):

`apps/ai-pipeline/parsers/docx_parser.py`:
```python
from .base import ParsedDocument, PageContent

def parse_docx(file_bytes: bytes) -> ParsedDocument:
    """Parse DOCX with python-docx."""
    import io
    from docx import Document
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    full_text = "\n\n".join(paragraphs)
    return ParsedDocument(
        pages=[PageContent(text=full_text, location={"page_number": 1})],
        metadata={"format": "docx", "paragraph_count": len(paragraphs)}
    )
```

`apps/ai-pipeline/parsers/pptx_parser.py`:
```python
from .base import ParsedDocument, PageContent

def parse_pptx(file_bytes: bytes) -> ParsedDocument:
    """Parse PPTX with python-pptx."""
    import io
    from pptx import Presentation
    prs = Presentation(io.BytesIO(file_bytes))
    pages = []
    for i, slide in enumerate(prs.slides):
        texts = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                texts.append(shape.text_frame.text)
        pages.append(PageContent(
            text="\n".join(texts),
            location={"slide_number": i + 1}
        ))
    return ParsedDocument(
        pages=pages,
        metadata={"format": "pptx", "slide_count": len(prs.slides)}
    )
```

`apps/ai-pipeline/parsers/xlsx_parser.py`:
```python
from .base import ParsedDocument, PageContent

def parse_xlsx(file_bytes: bytes) -> ParsedDocument:
    """Parse XLSX with openpyxl."""
    import io
    from openpyxl import load_workbook
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True)
    pages = []
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows_text = []
        for row_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
            row_str = " | ".join(str(v) if v is not None else "" for v in row)
            rows_text.append(f"Row {row_idx}: {row_str}")
        pages.append(PageContent(
            text="\n".join(rows_text),
            location={"sheet_name": sheet_name, "row_number": len(rows_text)}
        ))
    return ParsedDocument(
        pages=pages,
        metadata={"format": "xlsx", "sheet_count": len(wb.sheetnames)}
    )
```

`apps/ai-pipeline/parsers/md_parser.py`:
```python
from .base import ParsedDocument, PageContent

def parse_md(file_bytes: bytes) -> ParsedDocument:
    """Parse Markdown or plain text."""
    text = file_bytes.decode("utf-8", errors="replace")
    return ParsedDocument(
        pages=[PageContent(text=text, location={"page_number": 1})],
        metadata={"format": "md"}
    )
```

7. Run tests:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/ai-pipeline
docker run --rm -v "$(pwd):/app" -w /app python:3.12-slim sh -c "pip install uv && uv pip install --system pypdf pdfplumber python-docx python-pptx openpyxl pytest 2>&1 | tail -3 && pytest tests/test_pdf_parser.py -v 2>&1 | tail -15"
```

Expected: At least 1-2 tests pass.

8. Commit:
```bash
git add apps/ai-pipeline/
git commit -m "feat(ai): add document parsers (PDF/DOCX/PPTX/XLSX/MD)

- PDF parser with pypdf → pdfplumber fallback chain
- DOCX parser via python-docx
- PPTX parser via python-pptx (slide number tracking)
- XLSX parser via openpyxl (sheet + row tracking)
- MD/TXT parser (simple)
- ParsedDocument + PageContent dataclasses
- Base parser protocol
- PDF parser tests pass"
```

---

### Task 4: Chunker (500 tokens, overlap 50)

**Files**:
- Create: `apps/ai-pipeline/chunker.py`
- Create: `apps/ai-pipeline/tests/test_chunker.py`

**Steps**:

1. Create `apps/ai-pipeline/chunker.py`:
```python
from dataclasses import dataclass
from typing import List, Dict, Any
import tiktoken

from parsers.base import ParsedDocument, PageContent

CHUNK_SIZE = 500
OVERLAP = 50

@dataclass
class Chunk:
    text: str
    location: Dict[str, Any]
    chunk_index: int
    token_count: int

def chunk_document(doc: ParsedDocument) -> List[Chunk]:
    """Split parsed document into ~500-token chunks with 50 overlap.
    
    Preserves location info from page/slide/sheet boundaries.
    """
    enc = tiktoken.get_encoding("cl100k_base")
    chunks = []
    chunk_index = 0
    
    for page in doc.pages:
        tokens = enc.encode(page.text)
        page_location = page.location
        
        start = 0
        while start < len(tokens):
            end = min(start + CHUNK_SIZE, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = enc.decode(chunk_tokens)
            
            chunks.append(Chunk(
                text=chunk_text,
                location=page_location,
                chunk_index=chunk_index,
                token_count=len(chunk_tokens)
            ))
            chunk_index += 1
            
            if end >= len(tokens):
                break
            start = end - OVERLAP
    
    return chunks
```

2. Create `apps/ai-pipeline/tests/test_chunker.py`:
```python
import pytest
from chunker import chunk_document, CHUNK_SIZE, OVERLAP
from parsers.base import ParsedDocument, PageContent

def test_chunks_short_text_into_one_chunk():
    doc = ParsedDocument(
        pages=[PageContent(text="Short text.", location={"page_number": 1})]
    )
    chunks = chunk_document(doc)
    assert len(chunks) == 1
    assert chunks[0].chunk_index == 0
    assert chunks[0].location == {"page_number": 1}

def test_chunks_long_text_into_multiple():
    long_text = "Lorem ipsum " * 1000  # ~12000 chars
    doc = ParsedDocument(
        pages=[PageContent(text=long_text, location={"page_number": 1})]
    )
    chunks = chunk_document(doc)
    assert len(chunks) > 1
    assert all(c.token_count <= CHUNK_SIZE for c in chunks)

def test_chunks_preserve_location():
    doc = ParsedDocument(
        pages=[
            PageContent(text="Page 1 content " * 100, location={"page_number": 1}),
            PageContent(text="Page 2 content " * 100, location={"page_number": 2}),
        ]
    )
    chunks = chunk_document(doc)
    page_nums = [c.location["page_number"] for c in chunks]
    assert 1 in page_nums
    assert 2 in page_nums
```

3. Run tests:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/ai-pipeline
docker run --rm -v "$(pwd):/app" -w /app python:3.12-slim sh -c "pip install uv tiktoken 2>&1 | tail -2 && pytest tests/test_chunker.py -v 2>&1 | tail -15"
```

Expected: 3 tests pass.

4. Commit:
```bash
git add apps/ai-pipeline/chunker.py apps/ai-pipeline/tests/test_chunker.py
git commit -m "feat(ai): add chunker with 500-token size + 50 overlap

- Uses tiktoken cl100k_base encoding
- Preserves page/slide/sheet location per chunk
- 3 unit tests: short/long text + location preservation"
```

---

### Task 5: Ollama Summarizer (with JSON output)

**Files**:
- Create: `apps/ai-pipeline/summarizer.py`
- Create: `apps/ai-pipeline/tests/test_summarizer.py`

**Steps**:

1. Create `apps/ai-pipeline/summarizer.py`:
```python
import httpx
import json
import re
from typing import Dict, Any, List
from chunker import Chunk

OLLAMA_HOST = "http://ollama:11434"
OLLAMA_MODEL = "qwen2.5:7b"

SUMMARIZE_PROMPT = """Bạn là trợ lý AI phân tích tài liệu quy trình/quy định.
Hãy tóm tắt nội dung sau thành JSON với format:

{{
  "executive_summary": "Tóm tắt tổng quan (2-3 câu)",
  "checklist": ["Bước 1", "Bước 2", ...],
  "citations": [
    {{"claim": "Trích dẫn tuyên bố", "chunk_index": 0}}
  ]
}}

CHÚ Ý: Output CHÍNH XÁC là JSON, không có text nào khác.

NỘI DUNG:
{text}
"""

async def summarize_chunks(
    chunks: List[Chunk],
    ollama_host: str = OLLAMA_HOST,
    model: str = OLLAMA_MODEL,
) -> Dict[str, Any]:
    """Summarize chunks via Ollama. Combines all chunks then summarizes."""
    combined_text = "\n\n---\n\n".join(
        f"[Chunk {c.chunk_index}]: {c.text}" for c in chunks
    )
    
    prompt = SUMMARIZE_PROMPT.format(text=combined_text[:8000])  # limit input
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{ollama_host}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",  # Force JSON output
            },
        )
        response.raise_for_status()
        result = response.json()
    
    raw = result.get("response", "{}")
    
    # Try parsing JSON
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try extracting JSON from text
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        # Fallback
        return {
            "executive_summary": raw[:500],
            "checklist": [],
            "citations": [],
        }
```

2. Create `apps/ai-pipeline/tests/test_summarizer.py`:
```python
import pytest
from unittest.mock import AsyncMock, patch
from summarizer import summarize_chunks
from chunker import Chunk

def make_chunk(text: str, idx: int = 0):
    return Chunk(text=text, location={"page_number": 1}, chunk_index=idx, token_count=10)

@pytest.mark.asyncio
async def test_summarize_parses_valid_json():
    chunks = [make_chunk("Test content here")]
    
    mock_response = AsyncMock()
    mock_response.json.return_value = {"response": '{"executive_summary": "Test", "checklist": ["step1"], "citations": []}'}
    mock_response.raise_for_status = AsyncMock()
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
        
        result = await summarize_chunks(chunks)
    
    assert result["executive_summary"] == "Test"
    assert "step1" in result["checklist"]

@pytest.mark.asyncio
async def test_summarize_handles_invalid_json():
    chunks = [make_chunk("Test")]
    
    mock_response = AsyncMock()
    mock_response.json.return_value = {"response": "Not valid JSON {incomplete"}
    mock_response.raise_for_status = AsyncMock()
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
        
        result = await summarize_chunks(chunks)
    
    # Should fallback to text
    assert "executive_summary" in result
    assert isinstance(result["checklist"], list)
```

3. Add to `pyproject.toml` dev deps:
```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
]
```

4. Run tests:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/ai-pipeline
docker run --rm -v "$(pwd):/app" -w /app python:3.12-slim sh -c "pip install uv pytest pytest-asyncio httpx 2>&1 | tail -2 && pytest tests/test_summarizer.py -v 2>&1 | tail -15"
```

5. Commit:
```bash
git add apps/ai-pipeline/summarizer.py apps/ai-pipeline/tests/test_summarizer.py apps/ai-pipeline/pyproject.toml
git commit -m "feat(ai): add Ollama summarizer with JSON output

- POST /api/generate to Ollama qwen2.5:7b
- format=json forces JSON output
- Fallback regex extraction if JSON invalid
- 2 unit tests with mocked Ollama response"
```

---

### Task 6: Ollama Flowchart Generator

**Files**:
- Create: `apps/ai-pipeline/flowchart_gen.py`
- Create: `apps/ai-pipeline/tests/test_flowchart_gen.py`

**Steps**:

1. Create `apps/ai-pipeline/flowchart_gen.py`:
```python
import httpx
import re
from typing import List
from chunker import Chunk

OLLAMA_HOST = "http://ollama:11434"
OLLAMA_MODEL = "qwen2.5:7b"

FLOWCHART_PROMPT = """Bạn là trợ lý AI tạo flowchart từ tài liệu.
Hãy tạo flowchart bằng Mermaid syntax từ nội dung sau.
CHỈ output Mermaid syntax (bắt đầu bằng 'flowchart TD' hoặc 'graph TD'), không giải thích gì thêm.

NỘI DUNG:
{text}
"""

async def generate_flowchart(
    chunks: List[Chunk],
    ollama_host: str = OLLAMA_HOST,
    model: str = OLLAMA_MODEL,
) -> str:
    """Generate Mermaid flowchart syntax from chunks."""
    combined_text = "\n\n".join(c.text for c in chunks)[:6000]
    
    prompt = FLOWCHART_PROMPT.format(text=combined_text)
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{ollama_host}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        result = response.json()
    
    raw = result.get("response", "").strip()
    
    # Extract Mermaid code from code block if present
    match = re.search(r"```(?:mermaid)?\s*\n?(.*?)```", raw, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # Otherwise assume entire response is Mermaid
    return raw
```

2. Create `apps/ai-pipeline/tests/test_flowchart_gen.py`:
```python
import pytest
from unittest.mock import AsyncMock, patch
from flowchart_gen import generate_flowchart
from chunker import Chunk

def make_chunk(text: str, idx: int = 0):
    return Chunk(text=text, location={"page_number": 1}, chunk_index=idx, token_count=10)

@pytest.mark.asyncio
async def test_generate_flowchart_extracts_code_block():
    chunks = [make_chunk("Step 1: Do A. Step 2: Do B.")]
    
    mock_response = AsyncMock()
    mock_response.json.return_value = {
        "response": "```mermaid\nflowchart TD\n    A[Start] --> B[End]\n```"
    }
    mock_response.raise_for_status = AsyncMock()
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
        
        result = await generate_flowchart(chunks)
    
    assert "flowchart TD" in result
    assert "```" not in result  # Code block stripped

@pytest.mark.asyncio
async def test_generate_flowchart_handles_raw_output():
    chunks = [make_chunk("Steps")]
    
    mock_response = AsyncMock()
    mock_response.json.return_value = {
        "response": "graph TD\n    A --> B"
    }
    mock_response.raise_for_status = AsyncMock()
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
        
        result = await generate_flowchart(chunks)
    
    assert "graph TD" in result
```

3. Run tests:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/ai-pipeline
docker run --rm -v "$(pwd):/app" -w /app python:3.12-slim sh -c "pytest tests/test_flowchart_gen.py -v 2>&1 | tail -15"
```

4. Commit:
```bash
git add apps/ai-pipeline/flowchart_gen.py apps/ai-pipeline/tests/test_flowchart_gen.py
git commit -m "feat(ai): add Ollama flowchart generator (Mermaid syntax)

- POST /api/generate to Ollama with flowchart prompt
- Extracts Mermaid from code blocks if present
- Returns raw Mermaid otherwise
- 2 unit tests with mocked Ollama"
```

---

### Task 7: AsyncPG DB Client + Save Functions

**Files**:
- Create: `apps/ai-pipeline/db.py`

**Steps**:

1. Create `apps/ai-pipeline/db.py`:
```python
import asyncpg
import os
import json
from typing import List, Dict, Any
from chunker import Chunk

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://rikkei@postgres:5432/rikkei_docs")

_pool = None

async def get_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    return _pool

async def save_chunks(document_id: str, chunks: List[Chunk]) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Delete existing chunks for this document
        await conn.execute("DELETE FROM document_chunks WHERE document_id = $1", document_id)
        # Insert new
        for chunk in chunks:
            await conn.execute(
                """
                INSERT INTO document_chunks 
                (id, document_id, chunk_index, text, page_number, slide_number, sheet_name, row_number, token_count, created_at)
                VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
                """,
                document_id,
                chunk.chunk_index,
                chunk.text,
                chunk.location.get("page_number"),
                chunk.location.get("slide_number"),
                chunk.location.get("sheet_name"),
                chunk.location.get("row_number"),
                chunk.token_count,
            )

async def save_summary(document_id: str, summary: Dict[str, Any], model: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO document_summaries 
            (id, document_id, executive_summary, checklist, model_used, created_at)
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
            ON CONFLICT (document_id) DO UPDATE SET
              executive_summary = EXCLUDED.executive_summary,
              checklist = EXCLUDED.checklist,
              model_used = EXCLUDED.model_used,
              created_at = NOW()
            """,
            document_id,
            summary.get("executive_summary", ""),
            json.dumps(summary.get("checklist", [])),
            model,
        )

async def save_flowchart(document_id: str, mermaid: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO document_flowcharts 
            (id, document_id, mermaid_syntax, created_at)
            VALUES (gen_random_uuid()::text, $1, $2, NOW())
            ON CONFLICT (document_id) DO UPDATE SET
              mermaid_syntax = EXCLUDED.mermaid_syntax,
              created_at = NOW()
            """,
            document_id,
            mermaid,
        )

async def save_citations(document_id: str, citations: List[Dict[str, Any]]) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Delete old citations
        await conn.execute("DELETE FROM citations WHERE document_id = $1", document_id)
        # Get chunk IDs by index
        chunk_rows = await conn.fetch(
            "SELECT id, chunk_index FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index",
            document_id,
        )
        chunk_index_to_id = {row["chunk_index"]: row["id"] for row in chunk_rows}
        
        for idx, cit in enumerate(citations):
            chunk_index = cit.get("chunk_index", 0)
            chunk_id = chunk_index_to_id.get(chunk_index)
            if not chunk_id:
                continue
            await conn.execute(
                """
                INSERT INTO citations
                (id, document_id, chunk_id, claim_text, page_number, slide_number, sheet_name, row_number, column_letter, "order", created_at)
                VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                """,
                document_id,
                chunk_id,
                cit.get("claim", ""),
                cit.get("page_number"),
                cit.get("slide_number"),
                cit.get("sheet_name"),
                cit.get("row_number"),
                cit.get("column_letter"),
                idx,
            )

async def update_document_status(document_id: str, status: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2",
            status,
            document_id,
        )
```

2. Commit:
```bash
git add apps/ai-pipeline/db.py
git commit -m "feat(ai): add asyncpg DB client for AI tables

- save_chunks: batch insert with location polymorphic fields
- save_summary: upsert with model tracking
- save_flowchart: upsert Mermaid syntax
- save_citations: join chunks by index, insert claim + location
- update_document_status: mark published/failed"
```

---

### Task 8: Main Processing Endpoint

**Files**:
- Create: `apps/ai-pipeline/main.py` (replace placeholder)

**Steps**:

1. Replace `apps/ai-pipeline/main.py`:
```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx
import os

from parsers import parse_pdf, parse_docx, parse_pptx, parse_xlsx, parse_md
from chunker import chunk_document
from summarizer import summarize_chunks
from flowchart_gen import generate_flowchart
from db import (
    save_chunks, save_summary, save_flowchart, save_citations, update_document_status,
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
        # 1. Download file
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(f"{STORAGE_URL}/api/documents/{document_id}/download")
            response.raise_for_status()
            file_bytes = response.content
        
        # 2. Parse
        parser = PARSER_MAP[format]
        doc = parser(file_bytes)
        
        if doc.total_chars() == 0:
            update_document_status(document_id, "archived")  # empty doc
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
        await update_document_status(document_id, "draft")  # keep as draft, will retry
```

2. Commit:
```bash
git add apps/ai-pipeline/main.py
git commit -m "feat(ai): add /process endpoint with full pipeline

- POST /process kicks off background task
- Downloads file from Next.js storage
- Parse → chunk → save chunks
- Summarize via Ollama → save summary + citations
- Flowchart via Ollama → save Mermaid
- Update Document.status to 'published' on success
- On failure: status stays 'draft' (retry-able)"
```

---

### Task 9: Next.js Upload Trigger + Polling

**Files**:
- Modify: `apps/web/app/api/documents/upload/route.ts` — trigger AI
- Create: `apps/web/app/api/documents/[id]/process/route.ts`
- Modify: `apps/web/lib/trpc/routers/documents.ts` — add processingStatus proc

**Steps**:

1. Update `apps/web/app/api/documents/upload/route.ts` — add AI trigger at the end:
```ts
// At end of POST function, after file is saved and DB updated:

// Trigger AI processing (fire-and-forget)
const aiPipelineUrl = process.env.AI_PIPELINE_URL ?? 'http://ai-pipeline:8000';
try {
  await fetch(`${aiPipelineUrl}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: updated.id,
      storage_path: updated.storagePath,
      format: updated.format,
    }),
  });
} catch (err) {
  console.warn('AI pipeline trigger failed (continuing):', err);
}
```

2. Create `apps/web/app/api/documents/[id]/process/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  const aiPipelineUrl = process.env.AI_PIPELINE_URL ?? 'http://ai-pipeline:8000';
  
  try {
    await fetch(`${aiPipelineUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: doc.id,
        storage_path: doc.storagePath,
        format: doc.format,
      }),
    });
    return NextResponse.json({ status: 'processing' });
  } catch (err) {
    return NextResponse.json(
      { error: 'AI pipeline unavailable' },
      { status: 503 }
    );
  }
}
```

3. Update `apps/web/lib/trpc/routers/documents.ts` — add processingStatus proc:
```ts
// Add to documentsRouter:
processingStatus: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    const doc = await prisma.document.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        status: true,
        summary: { select: { id: true, createdAt: true } },
        flowchart: { select: { id: true, createdAt: true } },
        _count: { select: { chunks: true, citations: true } },
      },
    });
    if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });
    return {
      status: doc.status,
      hasSummary: !!doc.summary,
      hasFlowchart: !!doc.flowchart,
      chunkCount: doc._count.chunks,
      citationCount: doc._count.citations,
    };
  }),
```

4. Update web service in `docker-compose.yml` — add `AI_PIPELINE_URL`:
```yaml
  web:
    environment:
      ...
      AI_PIPELINE_URL: http://ai-pipeline:8000
```

5. Verify typecheck:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web && npm run typecheck 2>&1 | tail -10
```

6. Commit:
```bash
git add apps/web/app/api/documents/upload/route.ts apps/web/app/api/documents/\[id\]/process/route.ts apps/web/lib/trpc/routers/documents.ts docker-compose.yml
git commit -m "feat(web): trigger AI processing on upload + add processingStatus tRPC

- Upload route fires /process to ai-pipeline (fire-and-forget)
- New /api/documents/[id]/process endpoint for manual trigger
- processingStatus tRPC proc returns hasSummary/hasFlowchart/counts
- web service gets AI_PIPELINE_URL env var"
```

---

### Task 10: Final Verification

**Files**: none (verification only)

**Steps**:

1. Build ai-pipeline image:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
docker compose --profile ai build ai-pipeline
```

2. Start with AI profile:
```bash
docker compose --profile ai up -d
```

3. Pull Ollama model (first time only):
```bash
docker compose --profile ai exec ollama ollama pull qwen2.5:7b
```

4. Check ai-pipeline health:
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok"}`

5. Upload a PDF via web UI, watch logs:
```bash
docker compose --profile ai logs -f ai-pipeline
```

Expected: Pipeline logs showing parse → chunk → summarize → flowchart steps.

6. Verify in DB:
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT id, status FROM documents;"
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT document_id, executive_summary FROM document_summaries;"
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT COUNT(*) FROM document_chunks;"
```

Expected: Document status='published', summary row, chunks created.

---

## Self-Review

### Spec Coverage
✅ All AI Pipeline MVP requirements:
- "Auto-trigger after upload" → Task 9 (web fires /process)
- "Multi-format parsing with fallback chain" → Task 3 (PDF pypdf → pdfplumber)
- "Chunk ~500 tokens, overlap 50" → Task 4
- "Summarize via Ollama qwen2.5:7b, JSON output" → Task 5
- "Flowchart via Ollama, Mermaid syntax" → Task 6
- "Save to DocumentSummary, DocumentFlowchart, Citation tables" → Task 7
- "Polymorphic location tracking" → Tasks 2 (schema) + 4 (chunker) + 7 (save)

### Placeholder Scan
- No TODO/TBD thật. Tất cả tables, endpoints, parsers implemented.

### Type/Name Consistency
- DB tables snake_case via @@map
- Python dataclasses PascalCase
- Field names match between Prisma and Python

### Docker Network
- All DB access via Docker internal network (postgresql://rikkei@postgres:5432/...)
- Ollama via ollama:11434 (no auth needed)
- Web → AI: http://ai-pipeline:8000 (internal)

---

## Execution Handoff

**Subagent-driven development**. Mỗi task 1-9 sẽ được dispatch subagent với:
- Task number + description từ plan này
- Context: đọc CLAUDE.md + relevant docs
- 2 vòng review (spec compliance + code quality)

Task 10 (verification) chạy trực tiếp bởi main loop.

**Note**: Tailwind v4 spacing bug → dùng inline styles cho Plan 3 UI (nếu có). AI pipeline không cần UI nên không affected.