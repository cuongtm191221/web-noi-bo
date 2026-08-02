from dataclasses import dataclass, field
from typing import List, Dict, Any


@dataclass
class PageContent:
    """Single page/slide/sheet content."""
    text: str
    location: Dict[str, Any] = field(default_factory=dict)
    # location keys: page_number, slide_number, sheet_name, row_number, column_letter


@dataclass
class ParsedDocument:
    """Output of parser."""
    pages: List[PageContent]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def full_text(self) -> str:
        return "\n\n".join(p.text for p in self.pages)

    def total_chars(self) -> int:
        return sum(len(p.text) for p in self.pages)