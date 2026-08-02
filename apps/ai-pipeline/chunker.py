from dataclasses import dataclass
from typing import List, Dict, Any
import tiktoken

from parsers.base import ParsedDocument, PageContent

CHUNK_SIZE = 500
OVERLAP = 50


@dataclass
class Chunk:
    text: str
    location: Dict[str, Any]
    chunk_index: int
    token_count: int


def chunk_document(doc: ParsedDocument) -> List[Chunk]:
    """Split parsed document into ~500-token chunks with 50 overlap.

    Preserves location info from page/slide/sheet boundaries.
    """
    enc = tiktoken.get_encoding("cl100k_base")
    chunks = []
    chunk_index = 0

    for page in doc.pages:
        tokens = enc.encode(page.text)
        page_location = page.location

        start = 0
        while start < len(tokens):
            end = min(start + CHUNK_SIZE, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = enc.decode(chunk_tokens)

            chunks.append(Chunk(
                text=chunk_text,
                location=page_location,
                chunk_index=chunk_index,
                token_count=len(chunk_tokens),
            ))
            chunk_index += 1

            if end >= len(tokens):
                break
            start = end - OVERLAP

    return chunks