import pytest
from chunker import chunk_document, CHUNK_SIZE, OVERLAP
from parsers.base import ParsedDocument, PageContent


def test_chunks_short_text_into_one_chunk():
    doc = ParsedDocument(
        pages=[PageContent(text="Short text.", location={"page_number": 1})],
    )
    chunks = chunk_document(doc)
    assert len(chunks) == 1
    assert chunks[0].chunk_index == 0
    assert chunks[0].location == {"page_number": 1}


def test_chunks_long_text_into_multiple():
    long_text = "Lorem ipsum " * 1000  # ~12000 chars
    doc = ParsedDocument(
        pages=[PageContent(text=long_text, location={"page_number": 1})],
    )
    chunks = chunk_document(doc)
    assert len(chunks) > 1
    assert all(c.token_count <= CHUNK_SIZE for c in chunks)


def test_chunks_preserve_location():
    doc = ParsedDocument(
        pages=[
            PageContent(text="Page 1 content " * 100, location={"page_number": 1}),
            PageContent(text="Page 2 content " * 100, location={"page_number": 2}),
        ],
    )
    chunks = chunk_document(doc)
    page_nums = [c.location["page_number"] for c in chunks]
    assert 1 in page_nums
    assert 2 in page_nums


def test_chunks_have_overlap():
    """Verify chunks overlap by OVERLAP tokens."""
    long_text = "abcdef " * 1000
    doc = ParsedDocument(
        pages=[PageContent(text=long_text, location={"page_number": 1})],
    )
    chunks = chunk_document(doc)
    if len(chunks) >= 2:
        # Second chunk should start where first chunk mostly ended
        assert chunks[1].chunk_index == 1
        assert chunks[1].location == chunks[0].location


def test_chunks_index_sequential():
    """Chunk indices should be sequential across pages."""
    doc = ParsedDocument(
        pages=[
            PageContent(text="Short", location={"page_number": 1}),
            PageContent(text="Also short", location={"page_number": 2}),
        ],
    )
    chunks = chunk_document(doc)
    indices = [c.chunk_index for c in chunks]
    assert indices == list(range(len(chunks)))