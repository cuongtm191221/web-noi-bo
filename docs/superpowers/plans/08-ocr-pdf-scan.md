# Plan 8: OCR Pipeline cho PDF Scan

**Date**: 2026-08-03
**Spec**: [`docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`](../specs/2026-07-31-internal-document-mgmt-design.md) section 3.2
**Depends on**: Plan 1-7 ✅
**Priority**: NICE-TO-HAVE (after MVP)

## Execution Handoff

> **REQUIRED SUB-SKILL**: Use **subagent-driven-development**.

---

## Goal

Thêm OCR (Optical Character Recognition) cho PDF scan — hiện tại parser trả về text rỗng vì PDF không có text layer.

**Plan 8 scope**:
1. **Detect PDF scan** (text layer empty) — đã có partial logic
2. **Convert PDF pages → images** (pdf2image hoặc pdftoppm)
3. **OCR từng page** (Tesseract + Vietnamese data)
4. **Combine OCR results** → feed vào pipeline hiện tại

**KHÔNG bao gồm**:
- OCR cho DOCX/XLSX (Word + Excel đã có text, không cần)
- Cải thiện extraction speed (OCR chậm ~1-3s/page)
- OCR cho scanned images (.jpg, .png) — chỉ PDF

## Problem Statement

User upload PDF scan (slides trình bày bằng hình ảnh, tài liệu cũ scan) → `total_chars() == 0` → pipeline skip → status `draft` mãi mãi.

Current behavior (`main.py`):
```python
if doc.total_chars() == 0:
    logger.warning(f"[{document_id}] empty document (likely PDF scan)")
    await _safe_update_status(document_id, "draft")
    return
```

## Architecture

```
PDF scan uploaded
    ↓
PDF parser (pdfplumber) returns 0 text
    ↓
New: PDF → images (pdf2image)
    ↓
For each page:
    image → tesseract OCR (vie.traineddata)
    ↓
Combine OCR text → chunks → pipeline normal
```

### Tech Stack

- **pdf2image** (Python, wraps `pdftoppm`) — convert PDF pages to PNG
- **pytesseract** (Python wrapper for Tesseract)
- **tesseract-ocr** (system package)
- **tesseract-ocr-vie** (Vietnamese language data)

## Global Constraints

1. DRY, YAGNI, TDD, frequent commits
2. **Vietnamese support first** (primary use case at Rikkei)
3. **CPU-only** (no GPU dependency)
4. **Configurable DPI** (default 200 — good balance)
5. **No breaking change** — existing PDFs still work
6. **Status indicator** — user sees "OCR đang chạy..."

## File Structure

```
apps/ai-pipeline/
├── parsers/
│   ├── pdf_parser.py             # Modify: detect + OCR fallback
│   └── ocr.py                    # NEW: OCR wrapper (pdf2image + tesseract)
├── tests/
│   └── test_ocr.py               # NEW: unit tests
├── Dockerfile                    # Modify: add tesseract-ocr + tesseract-ocr-vie
└── README.md                     # Modify: document OCR
```

---

## Tasks

### Task 1: Install tesseract on Docker

**Files**:
- Modify: `apps/ai-pipeline/Dockerfile`

**Steps**:

1. Update `apps/ai-pipeline/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    tesseract-ocr-vie \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

COPY pyproject.toml .

RUN uv pip install --system .

COPY . .

CMD ["python", "-m", "server"]
```

Note:
- `tesseract-ocr` — base OCR engine
- `tesseract-ocr-vie` — Vietnamese language pack (~10MB data)
- `poppler-utils` — provides `pdftoppm` for pdf2image

2. Verify build:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
docker compose --profile ai build ai-pipeline
docker exec rikkei-ai-pipeline tesseract --version
docker exec rikkei-ai-pipeline tesseract --list-langs
```

Expected: `tesseract --version` returns version + `vie` language listed.

3. Commit:
```bash
git add apps/ai-pipeline/Dockerfile
git commit -m "feat(ai): add tesseract OCR + Vietnamese language pack

- tesseract-ocr: base engine
- tesseract-ocr-vie: Vietnamese traineddata
- poppler-utils: for pdf2image (pdftoppm)
- Add ~30MB to image size"
```

---

### Task 2: OCR wrapper module

**Files**:
- Create: `apps/ai-pipeline/parsers/ocr.py`

**Steps**:

1. Create `apps/ai-pipeline/parsers/ocr.py`:
```python
"""OCR extraction from PDF scans via Tesseract + pdf2image.

Only used as fallback when PDF has no text layer.
"""
import io
import logging
from typing import List
from pdf2image import convert_from_bytes
import pytesseract

logger = logging.getLogger(__name__)


def ocr_pdf(file_bytes: bytes, dpi: int = 200, lang: str = "vie+eng") -> str:
    """Extract text from PDF scan using OCR.

    Args:
        file_bytes: PDF file as bytes
        dpi: Resolution for PDF→image conversion (default 200)
        lang: Tesseract language code (default vie+eng for Vietnamese+English)

    Returns:
        Combined OCR text from all pages, with page markers.

    Raises:
        RuntimeError: If OCR fails or pdf2image fails
    """
    try:
        logger.info(f"OCR start: dpi={dpi}, lang={lang}")
        images = convert_from_bytes(file_bytes, dpi=dpi)
        logger.info(f"PDF converted to {len(images)} images")

        page_texts: List[str] = []
        for idx, image in enumerate(images, start=1):
            logger.info(f"OCR page {idx}/{len(images)}")
            # Convert PIL image to bytes for tesseract
            img_buffer = io.BytesIO()
            image.save(img_buffer, format="PNG")
            img_bytes = img_buffer.getvalue()

            text = pytesseract.image_to_string(
                img_bytes,
                lang=lang,
                config="--oem 3 --psm 1",  # LSTM engine + auto segmentation
            ).strip()

            page_texts.append(f"--- Page {idx} ---\n{text}")

        combined = "\n\n".join(page_texts)
        logger.info(f"OCR done: {len(combined)} chars")
        return combined

    except Exception as e:
        logger.error(f"OCR failed: {e}")
        raise RuntimeError(f"OCR extraction failed: {e}") from e
```

2. Update `apps/ai-pipeline/pyproject.toml`:
```toml
dependencies = [
    "mcp>=1.0",
    "asyncpg>=0.30",
    "pydantic>=2.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
]
```

For ai-pipeline, add (separate pyproject.toml if not exists):
```toml
dependencies = [
    "fastapi",
    "httpx",
    "pypdf>=4",
    "pdfplumber>=0.11",
    "python-docx>=1.1",
    "python-pptx>=1.0",
    "openpyxl>=3.1",
    "pyyaml",
    "pdf2image>=1.17",
    "pytesseract>=0.3.10",
]
```

3. Update `apps/ai-pipeline/pyproject.toml` with OCR deps (merge with existing).

4. Verify import:
```bash
docker compose --profile ai build ai-pipeline
docker compose --profile ai up -d
docker exec rikkei-ai-pipeline python3 -c "from parsers.ocr import ocr_pdf; print('ok')"
```

5. Commit:
```bash
git add apps/ai-pipeline/parsers/ocr.py apps/ai-pipeline/pyproject.toml
git commit -m "feat(ai): OCR wrapper using pdf2image + pytesseract

- Convert PDF pages to images (200 DPI default)
- Tesseract OCR with vie+eng languages
- Returns combined text with page markers
- Logs progress per page
- Configurable DPI + language"
```

---

### Task 3: Integrate OCR into PDF parser fallback

**Files**:
- Modify: `apps/ai-pipeline/parsers/pdf_parser.py`

**Steps**:

1. Update `apps/ai-pipeline/parsers/pdf_parser.py`:

Add OCR fallback at end of `parse_pdf`:
```python
"""PDF parser with OCR fallback for scanned PDFs."""
import io
import logging
from .base import ParsedDocument, PageContent
from parsers.ocr import ocr_pdf

logger = logging.getLogger(__name__)


def parse_pdf(file_bytes: bytes) -> ParsedDocument:
    """Parse PDF with text extraction, fallback to OCR if empty.

    Strategy:
    1. Try pypdf → if has text, return
    2. Try pdfplumber → if has text, return
    3. Fallback to OCR (pytesseract) → always returns text
    """
    parsed = _parse_with_pypdf(file_bytes)
    if parsed.total_chars() > 0:
        return parsed

    parsed = _parse_with_pdfplumber(file_bytes)
    if parsed.total_chars() > 0:
        return parsed

    # Both failed → PDF is likely scan, try OCR
    logger.warning("PDF text layer empty — falling back to OCR")
    try:
        ocr_text = ocr_pdf(file_bytes)
        # Split OCR text by page markers
        pages = []
        current_page = []
        for line in ocr_text.split("\n"):
            if line.startswith("--- Page "):
                if current_page:
                    pages.append(PageContent(text="\n".join(current_page)))
                current_page = []
            else:
                current_page.append(line)
        if current_page:
            pages.append(PageContent(text="\n".join(current_page)))
        return ParsedDocument(pages=pages)
    except RuntimeError as e:
        logger.error(f"OCR fallback also failed: {e}")
        return ParsedDocument(pages=[])


def _parse_with_pypdf(file_bytes: bytes) -> ParsedDocument:
    """Try pypdf first (faster)."""
    import pypdf
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    pages = []
    for idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(PageContent(text=text, page_number=idx))
    return ParsedDocument(pages=pages)


def _parse_with_pdfplumber(file_bytes: bytes) -> ParsedDocument:
    """Fallback to pdfplumber (better for tables)."""
    import pdfplumber
    pages = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            pages.append(PageContent(text=text, page_number=idx))
    return ParsedDocument(pages=pages)
```

(Note: existing `parsed_with_pypdf` and `parsed_with_pdfplumber` may have slightly different structure — adapt accordingly.)

2. Verify with existing PDF (text should still extract normally):
```bash
docker compose --profile ai restart ai-pipeline
# Test with a PDF on disk
docker exec rikkei-ai-pipeline python3 -c "
from parsers import parse_pdf
with open('/uploads/cmsca8dx10003s52hnug96s4h.pdf', 'rb') as f:
    data = f.read()
result = parse_pdf(data)
print('Chars:', result.total_chars())
print('Pages:', len(result.pages))
print('First 100 chars:', result.pages[0].text[:100] if result.pages else '<empty>')
"
```

Expected: Returns ~20000 chars (existing PDF still works via pypdf).

3. Commit:
```bash
git add apps/ai-pipeline/parsers/pdf_parser.py
git commit -m "feat(ai): PDF parser falls back to OCR for scans

- pypdf → pdfplumber → OCR (3-level fallback)
- OCR triggered only when text layer empty
- Logs which parser succeeded
- Existing text PDFs unchanged"
```

---

### Task 4: Test OCR with scanned PDF

**Files**:
- Manual test (no new files)

**Steps**:

1. Create a test scanned PDF (slide image → PDF):
```powershell
# On Windows: use any scanned PDF
# Or convert: PowerPoint with images → Save as PDF → Upload
```

2. Upload to system:
```powershell
# Use web UI at http://localhost:3000/upload
```

3. Check status:
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT id, status FROM documents ORDER BY created_at DESC LIMIT 3;"
docker compose --profile ai logs ai-pipeline --tail 30
```

Expected: Status `published`, summary + flowchart created via OCR.

4. If OCR slow (>10 min), consider:
- Lower DPI (150 vs 200)
- Process only first N pages for MVP
- Add timeout (don't OCR if PDF > 50 pages)

---

### Task 5: Add OCR unit tests

**Files**:
- Create: `apps/ai-pipeline/tests/test_ocr.py`

**Steps**:

1. Create `apps/ai-pipeline/tests/test_ocr.py`:
```python
"""Tests for OCR module."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from PIL import Image
import io


def create_test_image(text_bytes: bytes) -> bytes:
    """Create a simple test PNG with given text."""
    img = Image.new('RGB', (200, 100), color='white')
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    return img_buffer.getvalue()


def test_ocr_pdf_returns_text():
    """OCR should return combined text from all pages."""
    # Skip if tesseract not installed
    pytest.importorskip("pytesseract")

    from parsers.ocr import ocr_pdf
    # Create a minimal 1-page PDF with "TEST" text
    import pypdf
    from reportlab.pdfgen import canvas

    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer)
    c.drawString(100, 100, "TEST OCR")
    c.save()

    result = ocr_pdf(pdf_buffer.getvalue(), dpi=100)
    # OCR may not perfectly match, but should have some content
    assert len(result) > 0
    assert "--- Page 1 ---" in result
```

2. Add to `apps/ai-pipeline/pyproject.toml`:
```toml
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "reportlab>=4.0",  # for tests
]
```

3. Run tests:
```bash
docker exec rikkei-ai-pipeline python3 -m pytest tests/test_ocr.py -v
```

4. Commit:
```bash
git add apps/ai-pipeline/tests/test_ocr.py
git commit -m "test(ai): OCR unit test with simple text PDF

- Creates 1-page PDF with 'TEST OCR'
- Verifies OCR returns non-empty text
- Skips if tesseract not installed"
```

---

### Task 6: Update README + status badges

**Files**:
- Modify: `README.md`

**Steps**:

1. Update README.md with OCR feature note + update Plan status table:

Add a section:
```markdown
### OCR for Scanned PDFs

PDFs without a text layer (e.g., scanned documents, slide presentations) are now processed via OCR:

1. Pipeline tries `pypdf` → `pdfplumber` for text extraction
2. If empty, falls back to **Tesseract OCR** with Vietnamese + English language packs
3. OCR text is fed into normal AI pipeline (summarize + flowchart + citations)

**Performance**: ~1-3 seconds per page at 200 DPI. PDFs > 50 pages may take 1-2 minutes.

**Docker image size**: +30MB for tesseract + Vietnamese data.
```

2. Update Plan status table in README:
```markdown
| Plan 8 | ✅ | OCR cho PDF scan (tesseract + Vietnamese) |
```

3. Commit:
```bash
git add README.md
git commit -m "docs: OCR feature note + Plan 8 status update"
```

---

## Self-Review

### Spec Coverage
✅ Plan 8 scope:
- "OCR cho PDF scan (tesseract)" → Tasks 1-3
- Vietnamese support primary → Task 1 (vie language pack)

### Placeholder Scan
- No real TODOs/TBDs
- Speed optimization is implicit (lower DPI option)

### Type/Name Consistency
- `parse_pdf` signature unchanged
- New function `ocr_pdf(file_bytes, dpi, lang)` consistent
- Status flow: `parsing` (with OCR) → `published`

### Memory Compliance
- No new env vars
- Inline styles not applicable (Python backend)

---

## Execution Handoff

**Subagent-driven development**. Mỗi task 1-6 dispatch subagent. Task 4 verify với real scanned PDF.