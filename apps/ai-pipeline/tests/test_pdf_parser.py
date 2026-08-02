import pytest
from parsers.pdf_parser import parse_pdf


def test_parse_minimal_pdf():
    # 1-page PDF with "Hello World" text
    minimal_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
        b"/Contents 4 0 R/Resources<<>>>>endobj\n"
        b"4 0 obj<</Length 44>>stream\n"
        b"BT /F1 12 Tf 100 700 Td (Hello World) Tj ET\n"
        b"endstream endobj\n"
        b"xref\n0 5\n"
        b"0000000000 65535 f \n0000000009 00000 n \n"
        b"0000000056 00000 n \n0000000103 00000 n \n0000000175 00000 n \n"
        b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n260\n%%EOF"
    )
    doc = parse_pdf(minimal_pdf)
    assert doc.pages is not None
    assert doc.metadata["format"] == "pdf"
    assert len(doc.pages) >= 1
    assert "page_number" in doc.pages[0].location


def test_invalid_pdf_handles_gracefully():
    """Should not crash on invalid PDF input."""
    doc = parse_pdf(b"not a pdf")
    assert doc.pages is not None


def test_pdf_returns_total_pages_metadata():
    """Metadata should include total_pages count."""
    minimal_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
        b"/Contents 4 0 R/Resources<<>>>>endobj\n"
        b"4 0 obj<</Length 44>>stream\n"
        b"BT /F1 12 Tf 100 700 Td (Test) Tj ET\n"
        b"endstream endobj\n"
        b"xref\n0 5\n"
        b"0000000000 65535 f \n0000000009 00000 n \n"
        b"0000000056 00000 n \n0000000103 00000 n \n0000000175 00000 n \n"
        b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n260\n%%EOF"
    )
    doc = parse_pdf(minimal_pdf)
    assert "total_pages" in doc.metadata
    assert doc.metadata["total_pages"] >= 1