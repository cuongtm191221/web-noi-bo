"""Extract document outline (heading tree) from chunks using regex patterns.

Replaces LLM-generated flowchart which had reliability issues.
Output is deterministic, fast, and produces clean hierarchical structure.
"""
import re
from typing import List, Dict, Any
from chunker import Chunk


# Vietnamese + English heading patterns (ordered by priority)
HEADING_PATTERNS = [
    # Chương / Chapter (level 1)
    (r"^\s*(Chương|Chapter)\s+([IVXLCDM\d]+)", 1),
    (r"^\s*(Phần|Part)\s+([IVXLCDM\d]+)", 1),
    # Điều / Article (level 1)
    (r"^\s*(Điều|Article)\s+(\d+)", 2),
    # Mục / Section (level 2)
    (r"^\s*(Mục|Section)\s+(\d+)", 3),
    # Khoản / Clause (level 3)
    (r"^\s*(Khoản|Clause)\s+(\d+)", 4),
    # Bước / Step (level 2)
    (r"^\s*(Bước|Step|STT)\s+(\d+)", 3),
    # Numbered headings: "1.", "1)", "I.", "II." — allow colons and quotes
    (r"^\s*([IVXLCDM]+)\.\s+(.{3,80})$", 3),
    (r"^\s*(\d+)\.\s+(.{3,80})$", 3),
    (r"^\s*(\d+)\)\s+(.{3,80})$", 3),
    # ALL CAPS heading (level 1)
    (r"^([A-Z][A-Z\s]{4,30})$", 1),
]


def extract_headings(chunks: List[Chunk]) -> List[Dict[str, Any]]:
    """Extract hierarchical outline from chunks with content preview.

    Returns:
        List of {text, level, chunk_index, page_number, preview_text,
                 slide_number, sheet_name, row_number}
        sorted by chunk_index.
    """
    headings = []
    seen = set()  # dedupe identical text

    for chunk in chunks:
        # Split chunk into lines and check each
        lines = chunk.text.split("\n")
        heading_line_idx = None
        heading_text = None
        heading_level = None

        for idx, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) > 100:
                continue  # Skip empty/long lines

            for pattern, level in HEADING_PATTERNS:
                if re.match(pattern, line):
                    # Dedupe by text
                    text_key = line.lower()
                    if text_key in seen:
                        break
                    seen.add(text_key)

                    # Preview: lines after the heading (skip blank lines)
                    preview_lines = []
                    for next_line in lines[idx + 1:]:
                        next_line = next_line.strip()
                        if not next_line:
                            continue
                        if any(re.match(p, next_line) for p, _ in HEADING_PATTERNS):
                            break  # Stop at next heading
                        preview_lines.append(next_line)
                        if sum(len(l) for l in preview_lines) > 200:
                            break
                    preview_text = " ".join(preview_lines)[:200]
                    if len(" ".join(preview_lines)) > 200:
                        preview_text += "..."

                    headings.append({
                        "text": line[:80],
                        "level": level,
                        "chunk_index": chunk.chunk_index,
                        "page_number": chunk.location.get("page_number"),
                        "slide_number": chunk.location.get("slide_number"),
                        "sheet_name": chunk.location.get("sheet_name"),
                        "row_number": chunk.location.get("row_number"),
                        "preview_text": preview_text,
                    })
                    break

    return headings


def build_outline_tree(headings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Build tree structure from flat headings list using level as hierarchy.

    Returns:
        List of root nodes, each with children.
    """
    if not headings:
        return []

    roots: List[Dict[str, Any]] = []
    stack: List[Dict[str, Any]] = []

    for heading in headings:
        node = {**heading, "children": []}

        # Pop stack until we find a parent with lower level
        while stack and stack[-1]["level"] >= heading["level"]:
            stack.pop()

        if stack:
            stack[-1]["children"].append(node)
        else:
            roots.append(node)

        stack.append(node)

    return roots
