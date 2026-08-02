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
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        # Fallback
        return {
            "executive_summary": raw[:500],
            "checklist": [],
            "citations": [],
        }