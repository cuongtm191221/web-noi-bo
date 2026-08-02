from .base import ParsedDocument, PageContent


def parse_md(file_bytes: bytes) -> ParsedDocument:
    """Parse Markdown or plain text."""
    text = file_bytes.decode("utf-8", errors="replace")
    return ParsedDocument(
        pages=[PageContent(text=text, location={"page_number": 1})],
        metadata={"format": "md"},
    )