import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from summarizer import summarize_chunks
from chunker import Chunk


def make_chunk(text: str, idx: int = 0):
    return Chunk(
        text=text,
        location={"page_number": 1},
        chunk_index=idx,
        token_count=10,
    )


@pytest.mark.asyncio
async def test_summarize_parses_valid_json():
    chunks = [make_chunk("Test content here", idx=0)]

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "response": '{"executive_summary": "Test", "checklist": ["step1"], "citations": []}',
    }
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response,
        )

        result = await summarize_chunks(chunks)

    assert result["executive_summary"] == "Test"
    assert "step1" in result["checklist"]


@pytest.mark.asyncio
async def test_summarize_handles_invalid_json():
    chunks = [make_chunk("Test", idx=0)]

    mock_response = MagicMock()
    mock_response.json.return_value = {"response": "Not valid JSON {incomplete"}
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response,
        )

        result = await summarize_chunks(chunks)

    # Should fallback gracefully
    assert "executive_summary" in result
    assert isinstance(result["checklist"], list)


@pytest.mark.asyncio
async def test_summarize_extracts_json_from_text():
    """Should find JSON object even if wrapped in other text."""
    chunks = [make_chunk("Content", idx=0)]

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "response": 'Here is the summary: {"executive_summary": "Extracted", "checklist": [], "citations": []} done',
    }
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response,
        )

        result = await summarize_chunks(chunks)

    assert result["executive_summary"] == "Extracted"


@pytest.mark.asyncio
async def test_summarize_includes_chunk_indices_in_prompt():
    """Prompt should reference chunk indices for citation tracking."""
    chunks = [
        make_chunk("First chunk text", idx=0),
        make_chunk("Second chunk text", idx=1),
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "response": '{"executive_summary": "ok", "checklist": [], "citations": []}',
    }
    mock_response.raise_for_status = MagicMock()

    captured = {}

    async def capture_post(url, json):
        captured["prompt"] = json["prompt"]
        return mock_response

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = capture_post

        await summarize_chunks(chunks)

    assert "[Chunk 0]" in captured["prompt"]
    assert "[Chunk 1]" in captured["prompt"]