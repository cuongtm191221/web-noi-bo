import httpx
import re
from typing import List
from chunker import Chunk

OLLAMA_HOST = "http://ollama:11434"
OLLAMA_MODEL = "qwen2.5:7b"

FLOWCHART_PROMPT = """Bạn là trợ lý AI tạo flowchart từ tài liệu.
Hãy tạo flowchart bằng Mermaid syntax từ nội dung sau.
CHỈ output Mermaid syntax (bắt đầu bằng 'flowchart TD' hoặc 'graph TD'), không giải thích gì thêm.

NỘI DUNG:
{text}
"""


async def generate_flowchart(
    chunks: List[Chunk],
    ollama_host: str = OLLAMA_HOST,
    model: str = OLLAMA_MODEL,
) -> str:
    """Generate Mermaid flowchart syntax from chunks."""
    combined_text = "\n\n".join(c.text for c in chunks)[:6000]

    prompt = FLOWCHART_PROMPT.format(text=combined_text)

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{ollama_host}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        result = response.json()

    raw = result.get("response", "").strip()

    # Extract Mermaid code from code block if present
    match = re.search(r"```(?:mermaid)?\s*\n?(.*?)```", raw, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Otherwise assume entire response is Mermaid
    return _sanitize_mermaid(raw)


def _sanitize_mermaid(syntax: str) -> str:
    """Sanitize mermaid syntax to avoid parse errors.

    - Strip surrounding double quotes inside node labels: ["Foo"] -> [Foo]
    - Strip curly braces around node labels to prevent diamond+text issues: {Foo} -> (Foo)
    """
    # Replace ["..."] with [...] — quoted text breaks mermaid parser
    syntax = re.sub(r'\[("([^"\\]|\\.)*")\]', r'[\2]', syntax)
    # Replace {"..."} with (...) — quoted text in diamond shapes
    syntax = re.sub(r'\{\s*"([^"]*)"\s*\}', r'(\1)', syntax)
    return syntax