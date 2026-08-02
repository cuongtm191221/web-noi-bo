import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from tools.search import search_documents


@pytest.mark.asyncio
async def test_search_returns_results():
    """Should return list of matching documents with snippet."""
    mock_pool = MagicMock()
    mock_conn = MagicMock()
    mock_conn.fetch = AsyncMock(return_value=[
        {
            "id": "doc-1",
            "title": "Test Doc",
            "format": "pdf",
            "created_at": "2026-08-02",
            "rank": 0.5,
        },
    ])
    mock_conn.fetchrow = AsyncMock(return_value={
        "text": "Sample chunk text with keyword",
    })
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    with patch("tools.search.get_pool", AsyncMock(return_value=mock_pool)):
        mock_pool.acquire = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await search_documents("keyword", limit=5)

    assert len(result) == 1
    import json
    data = json.loads(result[0].text)
    assert len(data) == 1
    assert data[0]["title"] == "Test Doc"
    assert data[0]["snippet"] == "Sample chunk text with keyword"