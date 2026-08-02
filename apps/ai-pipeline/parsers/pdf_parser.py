import io
from .base import ParsedDocument, PageContent


def parse_pdf(file_bytes: bytes) -> ParsedDocument:
    """Parse PDF with pypdf -> pdfplumber fallback chain."""
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
            location={"page_number": i + 1},
        ))
    return ParsedDocument(
        pages=pages,
        metadata={"format": "pdf", "total_pages": len(reader.pages)},
    )


def _parse_with_pdfplumber(file_bytes: bytes) -> ParsedDocument:
    import pdfplumber
    pages = []
    total = 0
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            pages.append(PageContent(
                text=text,
                location={"page_number": i + 1},
            ))
        total = len(pdf.pages)
    return ParsedDocument(
        pages=pages,
        metadata={"format": "pdf", "total_pages": total},
    )