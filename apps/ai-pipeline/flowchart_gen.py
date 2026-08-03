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

    async with httpx.AsyncClient(timeout=300.0) as client:
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
    sanitized = _sanitize_mermaid(raw)
    if _is_valid_mermaid(sanitized):
        return sanitized
    # Fallback: generate simple linear flowchart from chunks text
    return _fallback_flowchart(chunks)


def _is_valid_mermaid(syntax: str) -> bool:
    """Basic mermaid syntax validation."""
    if not syntax:
        return False
    # Must start with graph or flowchart
    lines = [l.strip() for l in syntax.split("\n") if l.strip()]
    if not lines:
        return False
    first = lines[0]
    if not (first.startswith("graph") or first.startswith("flowchart")):
        return False
    # Must have at least 2 lines
    if len(lines) < 2:
        return False
    # Quick check: no unmatched brackets, no [;]
    if "[;]" in syntax:
        return False
    return True


def _fallback_flowchart(chunks: List[Chunk]) -> str:
    """Generate a simple linear flowchart from chunk keywords.

    Used when LLM output is invalid.
    """
    # Extract first sentence from each chunk's text (up to 50 chars)
    nodes = []
    for chunk in chunks[:6]:  # Limit to 6 nodes
        first_line = chunk.text.split("\n")[0].strip()[:50]
        if first_line:
            nodes.append(first_line)

    if len(nodes) < 2:
        return "flowchart TD\n    A[Không có dữ liệu]"
    lines = ["flowchart TD"]
    for i, node in enumerate(nodes):
        letter = chr(65 + i)
        # Strip any non-ASCII that might break parser
        clean = re.sub(r'[^a-zA-Z0-9 \-_áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ]', '', node).strip()
        if not clean:
            clean = f"Step {i + 1}"
        lines.append(f"    {letter}[{clean}]")
    for i in range(len(nodes) - 1):
        lines.append(f"    {chr(65 + i)} --> {chr(65 + i + 1)}")
    return "\n".join(lines)


def _sanitize_mermaid(syntax: str) -> str:
    """Sanitize mermaid syntax to avoid parse errors.

    Strategy: convert any node label with quotes/punctuation to plain text
    and keep only ASCII-safe characters.
    """
    # Replace quoted edge labels: -- "label" --> -- label -->
    syntax = re.sub(r'--\s*"([^"]*)"\s*-->', r'-- \1 -->', syntax)
    syntax = re.sub(r'--\s*"([^"]*)"\s*--', r'-- \1 --', syntax)
    # Replace quoted pipe labels: |"label"| |label|
    syntax = re.sub(r'\|"([^"]*)"\|', r'|\1|', syntax)
    # Replace ["..."] node labels with [text]
    syntax = re.sub(r'\["([^"]*)"\]', r'[\1]', syntax)
    # Replace {"..."} node labels with (text)
    syntax = re.sub(r'\{"([^"]*)"\}', r'(\1)', syntax)
    # Replace ("...")  node labels with (text)
    syntax = re.sub(r'\("([^"]*)"\)', r'(\1)', syntax)
    # Remove [;] empty labels
    syntax = re.sub(r'\[;\]', r'[]', syntax)
    # Remove trailing semicolons on lines
    syntax = re.sub(r';\s*$', '', syntax, flags=re.MULTILINE)
    # Remove Vietnamese quotation marks “ ” (mermaid parser confuses them)
    syntax = syntax.replace('“', '"').replace('”', '"')
    syntax = syntax.replace("'", "'").replace("'", "'")
    return syntax