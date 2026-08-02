import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from flowchart_gen import generate_flowchart
from chunker import Chunk


def make_chunk(text: str, idx: int = 0):
    return Chunk(
        text=text,
        location={"page_number": 1},
        chunk_index=idx,
        token_count=10,
    )


@pytest.mark.asyncio
async def test_generate_flowchart_extracts_code_block():
    chunks = [make_chunk("Step 1: Do A. Step 2: Do B.", idx=0)]

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "response": "```mermaid\nflowchart TD\n    A[Start] --> B[End]\n```",
    }
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response,
        )

        result = await generate_flowchart(chunks)

    assert "flowchart TD" in result
    assert "```" not in result  # Code block stripped


@pytest.mark.asyncio
async def test_generate_flowchart_handles_raw_output():
    chunks = [make_chunk("Steps", idx=0)]

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "response": "graph TD\n    A --> B",
    }
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response,
        )

        result = await generate_flowchart(chunks)

    assert "graph TD" in result


@pytest.mark.asyncio
async def test_generate_flowchart_handles_empty_response():
    chunks = [make_chunk("Content", idx=0)]

    mock_response = MagicMock()
    mock_response.json.return_value = {"response": ""}
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response,
        )

        result = await generate_flowchart(chunks)

    assert result == ""


@pytest.mark.asyncio
async def test_generate_flowchart_combines_chunks():
    """Should concatenate all chunks into prompt."""
    chunks = [
        make_chunk("First", idx=0),
        make_chunk("Second", idx=1),
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {"response": "graph TD\n    A --> B"}
    mock_response.raise_for_status = MagicMock()

    captured = {}

    async def capture_post(url, json):
        captured["prompt"] = json["prompt"]
        return mock_response

    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = capture_post

        await generate_flowchart(chunks)

    assert "First" in captured["prompt"]
    assert "Second" in captured["prompt"]