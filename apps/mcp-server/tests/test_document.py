import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from tools.document import get_document, get_summary


@pytest.mark.asyncio
async def test_get_document_returns_metadata_and_chunks():
    mock_pool = MagicMock()
    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(return_value={
        "id": "doc-1",
        "title": "Test",
        "filename": "test.pdf",
        "format": "pdf",
        "size_bytes": 1024,
        "status": "published",
        "uploader_name": "Admin",
        "category_name": "Test Cat",
        "created_at": "2026-08-02T00:00:00",
    })
    mock_conn.fetch = AsyncMock(return_value=[
        {
            "chunk_index": 0,
            "text": "Chunk 1 text",
            "page_number": 1,
            "slide_number": None,
            "sheet_name": None,
            "row_number": None,
        },
    ])

    with patch("tools.document.get_pool", AsyncMock(return_value=mock_pool)):
        mock_pool.acquire = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await get_document("doc-1")

    import json
    data = json.loads(result[0].text)
    assert data["title"] == "Test"
    assert len(data["chunks"]) == 1


@pytest.mark.asyncio
async def test_get_document_not_found():
    mock_pool = MagicMock()
    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(return_value=None)

    with patch("tools.document.get_pool", AsyncMock(return_value=mock_pool)):
        mock_pool.acquire = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await get_document("nonexistent")

    import json
    data = json.loads(result[0].text)
    assert "error" in data


@pytest.mark.asyncio
async def test_get_summary_returns_executive_summary():
    mock_pool = MagicMock()
    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock(return_value={
        "title": "Test",
        "executive_summary": "This is the summary",
        "checklist": '["Step 1", "Step 2"]',
        "model_used": "qwen2.5:7b",
        "mermaid_syntax": "graph TD\n  A --> B",
    })

    with patch("tools.document.get_pool", AsyncMock(return_value=mock_pool)):
        mock_pool.acquire = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await get_summary("doc-1")

    import json
    data = json.loads(result[0].text)
    assert data["executive_summary"] == "This is the summary"
    assert len(data["checklist"]) == 2