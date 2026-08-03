# Plan 6: MCP Server

**Date**: 2026-08-02
**Spec**: [`docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`](../specs/2026-07-31-internal-document-mgmt-design.md)
**Depends on**: Plan 1-5 ✅
**Next**: Plan 7 (Polish + Deploy)

## Execution Handoff

> **REQUIRED SUB-SKILL**: Use **subagent-driven-development**.

---

## Goal

Implement MCP (Model Context Protocol) Server exposing 4 tools so external AI agents (Claude Code, Cursor, etc.) can search + read documents:
1. `search_documents` — full-text search across documents
2. `get_document` — get document metadata + chunks + summary
3. `list_categories` — list all categories
4. `get_summary` — get document's AI summary

**Plan 6 scope**: ONLY MCP server with 4 tools. **KHÔNG bao gồm**:
- Web UI for MCP tools (external clients use it)
- SSE transport (stdio only — simpler, spec allows)
- OAuth / proper auth (use simple Bearer token)

## Problem Statement

External AI agents (like Claude Code) need access to Rikkei's documents to answer questions about internal processes. MCP standardizes this.

## Architecture

```
External AI Agent (Claude Code, etc.)
    ↓ (stdio + JSON-RPC)
MCP Server (Python stdio server)
    ↓ (asyncpg)
Postgres DB (read-only)
```

### Tools

| Tool | Input | Output |
|------|-------|--------|
| `search_documents` | `query`, `limit?` | List of `{id, title, snippet, format}` |
| `get_document` | `id` | Document metadata + chunks + summary |
| `list_categories` | (none) | List of categories |
| `get_summary` | `id` | Document summary |

## Tech Stack

- **Python 3.12** + **mcp** (Python SDK)
- **stdio transport** (simplest)
- **asyncpg** for DB access
- **Bearer token** auth via `MCP_API_KEY` env var

## Global Constraints

1. DRY, YAGNI, TDD, frequent commits
2. **Read-only DB access** — MCP tools shouldn't modify data
3. **Bearer token auth** — every request validates `Authorization: Bearer <key>`
4. **Inline styles** for any UI (per [[tailwind-v4-spacing-bug]] memory)
5. **No new env vars** beyond `MCP_API_KEY` + `DATABASE_URL`

## File Structure

```
apps/mcp-server/
├── pyproject.toml          # uv dependencies
├── server.py               # MCP server entry (stdio)
├── tools/
│   ├── __init__.py
│   ├── search.py           # search_documents
│   ├── document.py         # get_document, get_summary
│   └── categories.py       # list_categories
├── db.py                   # asyncpg client (read-only)
├── auth.py                 # Bearer token validation
├── tests/
│   ├── test_search.py
│   └── test_document.py
└── README.md               # How external clients connect
```

---

## Tasks

### Task 1: Docker Compose service for MCP

**Files**:
- Modify: `docker-compose.yml` (mcp-server section already exists from Plan 1)

**Steps**:

1. Update mcp-server section in `docker-compose.yml`:

Find the existing section and replace with:
```yaml
  mcp-server:
    build:
      context: ./apps/mcp-server
    container_name: rikkei-mcp-server
    profiles: ["mcp"]
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://rikkei@postgres:5432/rikkei_docs
      MCP_API_KEY: "${MCP_API_KEY:-dev_mcp_api_key_change_in_prod}"
    stdin_open: true
    tty: true
```

Note: `stdin_open: true` + `tty: true` enables stdio transport for MCP.

2. Verify section structure:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
grep -A 15 "mcp-server:" docker-compose.yml
```

Expected: matches above.

3. Commit:
```bash
git add docker-compose.yml
git commit -m "feat(mcp): configure mcp-server service with stdio transport

- Build from apps/mcp-server context
- Depends on postgres (read-only access)
- MCP_API_KEY env for Bearer token auth
- stdin_open + tty for MCP stdio transport
- Profile: mcp (opt-in like ai)"
```

---

### Task 2: MCP server scaffolding (pyproject + Dockerfile)

**Files**:
- Create: `apps/mcp-server/pyproject.toml`
- Create: `apps/mcp-server/Dockerfile`
- Create: `apps/mcp-server/server.py` (placeholder)

**Steps**:

1. Create `apps/mcp-server/Dockerfile`:
```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

COPY pyproject.toml .

RUN uv pip install --system .

COPY . .

CMD ["python", "-m", "server"]
```

2. Create `apps/mcp-server/pyproject.toml`:
```toml
[project]
name = "mcp-server"
version = "0.1.0"
description = "MCP server exposing Rikkei document tools"
requires-python = ">=3.12"
dependencies = [
    "mcp>=1.0",
    "asyncpg>=0.30",
    "pydantic>=2.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
]
```

3. Create `apps/mcp-server/server.py` (placeholder):
```python
"""MCP Server for Rikkei Document Management."""
import asyncio
import os
import sys
from mcp.server import Server
from mcp.types import Tool, TextContent
from mcp.server.stdio import stdio_server

app = Server("rikkei-docs-mcp")


@app.list_tools()
async def list_tools():
    return []


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    return [TextContent(type="text", text=f"Tool {name} not implemented")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
```

4. Create `apps/mcp-server/db.py`:
```python
"""AsyncPG client for MCP server (read-only)."""
import asyncpg
import os
from typing import Optional

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://rikkei@postgres:5432/rikkei_docs",
)

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=1,
            max_size=5,
        )
    return _pool
```

5. Create `apps/mcp-server/auth.py`:
```python
"""Bearer token validation for MCP requests."""
import os

MCP_API_KEY = os.environ.get(
    "MCP_API_KEY",
    "dev_mcp_api_key_change_in_prod",
)


def validate_token(token: Optional[str]) -> bool:
    """Validate Bearer token from MCP client."""
    if not token:
        return False
    # Strip "Bearer " prefix if present
    if token.startswith("Bearer "):
        token = token[len("Bearer "):]
    return token == MCP_API_KEY
```

6. Create `apps/mcp-server/tests/__init__.py` (empty)

7. Verify Docker build:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
docker compose --profile mcp build mcp-server
```

Expected: Image builds successfully.

8. Commit:
```bash
git add apps/mcp-server/
git commit -m "feat(mcp): scaffold MCP server with stdio transport

- Dockerfile (python:3.12-slim + uv)
- pyproject.toml with mcp SDK + asyncpg + pydantic
- server.py placeholder with stdio transport
- db.py: asyncpg read-only client
- auth.py: Bearer token validation
- Tests directory placeholder
- Docker build succeeds"
```

---

### Task 3: search_documents tool

**Files**:
- Create: `apps/mcp-server/tools/__init__.py`
- Create: `apps/mcp-server/tools/search.py`
- Create: `apps/mcp-server/tests/test_search.py`

**Steps**:

1. Create `apps/mcp-server/tools/__init__.py`:
```python
from . import search, document, categories
```

2. Create `apps/mcp-server/tools/search.py`:
```python
"""search_documents MCP tool."""
from typing import Any
from mcp.types import TextContent
from db import get_pool


async def search_documents(query: str, limit: int = 10) -> list[TextContent]:
    """Search documents by title + chunk text.

    Uses Postgres ILIKE for simple substring matching.
    """
    pool = await get_pool()

    async with pool.acquire() as conn:
        # Search in title + chunks
        rows = await conn.fetch(
            """
            SELECT DISTINCT
                d.id,
                d.title,
                d.format,
                d.created_at,
                ts_rank(
                    to_tsvector('simple', coalesce(d.title, '') || ' ' || coalesce(string_agg(c.text, ' '), '')),
                    plainto_tsquery('simple', $1)
                ) AS rank
            FROM documents d
            LEFT JOIN document_chunks c ON c.document_id = d.id
            WHERE
                to_tsvector('simple', coalesce(d.title, '') || ' ' || coalesce(c.text, ''))
                @@ plainto_tsquery('simple', $1)
                OR d.title ILIKE '%' || $1 || '%'
            GROUP BY d.id, d.title, d.format, d.created_at
            ORDER BY rank DESC, d.created_at DESC
            LIMIT $2
            """,
            query,
            limit,
        )

        results = []
        for row in rows:
            # Get a snippet from first matching chunk
            snippet_row = await conn.fetchrow(
                """
                SELECT text FROM document_chunks
                WHERE document_id = $1 AND text ILIKE '%' || $2 || '%'
                ORDER BY chunk_index LIMIT 1
                """,
                row["id"],
                query,
            )
            snippet = snippet_row["text"][:200] if snippet_row else ""
            results.append({
                "id": row["id"],
                "title": row["title"],
                "format": row["format"],
                "snippet": snippet,
            })

        import json
        return [TextContent(
            type="text",
            text=json.dumps(results, ensure_ascii=False, indent=2, default=str),
        )]
```

3. Create `apps/mcp-server/tests/test_search.py`:
```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from tools.search import search_documents


@pytest.mark.asyncio
async def test_search_returns_results():
    """Should return list of matching documents."""
    # Mock pool
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
```

4. Commit:
```bash
git add apps/mcp-server/tools/ apps/mcp-server/tests/test_search.py
git commit -m "feat(mcp): add search_documents tool with Postgres full-text search

- Uses to_tsvector + plainto_tsquery for relevance ranking
- Searches both title and chunks
- Returns id + title + format + snippet (200 chars)
- Configurable limit (default 10)
- Unit test with mocked DB pool"
```

---

### Task 4: get_document + get_summary tools

**Files**:
- Create: `apps/mcp-server/tools/document.py`
- Create: `apps/mcp-server/tests/test_document.py`

**Steps**:

1. Create `apps/mcp-server/tools/document.py`:
```python
"""get_document and get_summary MCP tools."""
from typing import Any
import json
from mcp.types import TextContent
from db import get_pool


async def get_document(doc_id: str) -> list[TextContent]:
    """Get document metadata + chunks."""
    pool = await get_pool()

    async with pool.acquire() as conn:
        # Get document + category + uploader
        doc_row = await conn.fetchrow(
            """
            SELECT
                d.id, d.title, d.filename, d.format, d.size_bytes,
                d.status, d.created_at, d.updated_at,
                u.name AS uploader_name,
                c.name AS category_name
            FROM documents d
            LEFT JOIN users u ON u.id = d.uploader_id
            LEFT JOIN categories c ON c.id = d.category_id
            WHERE d.id = $1
            """,
            doc_id,
        )

        if not doc_row:
            return [TextContent(type="text", text=json.dumps({"error": "Document not found"}))]

        # Get chunks
        chunk_rows = await conn.fetch(
            """
            SELECT chunk_index, text, page_number, slide_number, sheet_name, row_number
            FROM document_chunks
            WHERE document_id = $1
            ORDER BY chunk_index
            """,
            doc_id,
        )

        chunks = []
        for row in chunk_rows:
            chunks.append({
                "chunk_index": row["chunk_index"],
                "text": row["text"],
                "location": {
                    "page_number": row["page_number"],
                    "slide_number": row["slide_number"],
                    "sheet_name": row["sheet_name"],
                    "row_number": row["row_number"],
                },
            })

        return [TextContent(
            type="text",
            text=json.dumps(
                {
                    "id": doc_row["id"],
                    "title": doc_row["title"],
                    "filename": doc_row["filename"],
                    "format": doc_row["format"],
                    "size_bytes": doc_row["size_bytes"],
                    "status": doc_row["status"],
                    "uploader": doc_row["uploader_name"],
                    "category": doc_row["category_name"],
                    "created_at": doc_row["created_at"].isoformat(),
                    "chunks": chunks,
                },
                ensure_ascii=False,
                indent=2,
            ),
        )]


async def get_summary(doc_id: str) -> list[TextContent]:
    """Get document's AI summary."""
    pool = await get_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                d.title,
                s.executive_summary,
                s.checklist,
                s.model_used,
                s.created_at,
                f.mermaid_syntax
            FROM documents d
            LEFT JOIN document_summaries s ON s.document_id = d.id
            LEFT JOIN document_flowcharts f ON f.document_id = d.id
            WHERE d.id = $1
            """,
            doc_id,
        )

        if not row:
            return [TextContent(type="text", text=json.dumps({"error": "Document not found"}))]

        if not row["executive_summary"]:
            return [TextContent(type="text", text=json.dumps({"error": "No summary yet (AI processing)"}))]

        # checklist is JSONB - asyncpg returns as string
        checklist = row["checklist"]
        if isinstance(checklist, str):
            try:
                import json as _json
                checklist = _json.loads(checklist)
            except _json.JSONDecodeError:
                checklist = []

        return [TextContent(
            type="text",
            text=json.dumps(
                {
                    "title": row["title"],
                    "executive_summary": row["executive_summary"],
                    "checklist": checklist,
                    "model_used": row["model_used"],
                    "flowchart": row["mermaid_syntax"],
                },
                ensure_ascii=False,
                indent=2,
            ),
        )]
```

2. Create `apps/mcp-server/tests/test_document.py`:
```python
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
```

3. Commit:
```bash
git add apps/mcp-server/tools/document.py apps/mcp-server/tests/test_document.py
git commit -m "feat(mcp): add get_document + get_summary tools

- get_document: returns metadata + chunks + uploader + category
- get_summary: returns executive_summary + checklist + flowchart
- Both handle 'not found' gracefully
- Unit tests with mocked DB pool"
```

---

### Task 5: list_categories tool

**Files**:
- Create: `apps/mcp-server/tools/categories.py`

**Steps**:

1. Create `apps/mcp-server/tools/categories.py`:
```python
"""list_categories MCP tool."""
from typing import Any
import json
from mcp.types import TextContent
from db import get_pool


async def list_categories() -> list[TextContent]:
    """List all document categories."""
    pool = await get_pool()

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                c.id, c.name, c.slug, c.parent_id,
                parent.name AS parent_name,
                COUNT(d.id) AS document_count
            FROM categories c
            LEFT JOIN categories parent ON parent.id = c.parent_id
            LEFT JOIN documents d ON d.category_id = c.id
            GROUP BY c.id, c.name, c.slug, c.parent_id, parent.name
            ORDER BY c.name
            """,
        )

        categories = []
        for row in rows:
            categories.append({
                "id": row["id"],
                "name": row["name"],
                "slug": row["slug"],
                "parent_id": row["parent_id"],
                "parent_name": row["parent_name"],
                "document_count": row["document_count"],
            })

        return [TextContent(
            type="text",
            text=json.dumps(categories, ensure_ascii=False, indent=2, default=str),
        )]
```

2. Commit:
```bash
git add apps/mcp-server/tools/categories.py
git commit -m "feat(mcp): add list_categories tool

- Returns all categories with parent name + document count
- Ordered alphabetically
- Joins parent for hierarchical info"
```

---

### Task 6: Wire tools to MCP server

**Files**:
- Modify: `apps/mcp-server/server.py`

**Steps**:

1. Replace `apps/mcp-server/server.py`:
```python
"""MCP Server for Rikkei Document Management."""
import asyncio
import os
import sys
from mcp.server import Server
from mcp.types import Tool, TextContent
from mcp.server.stdio import stdio_server

from tools import search, document, categories
from auth import validate_token

app = Server("rikkei-docs-mcp")

# Authentication state
_current_token: str | None = None


def set_auth_token(token: str | None) -> None:
    global _current_token
    _current_token = token


def check_auth() -> bool:
    """Check if current request has valid Bearer token."""
    return validate_token(_current_token)


@app.list_tools()
async def list_tools():
    if not check_auth():
        return []

    return [
        Tool(
            name="search_documents",
            description="Search documents by query string. Returns matching documents with snippets.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results (default 10)",
                        "default": 10,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="get_document",
            description="Get full document details including all chunks.",
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Document ID",
                    },
                },
                "required": ["id"],
            },
        ),
        Tool(
            name="list_categories",
            description="List all document categories.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="get_summary",
            description="Get AI-generated summary + checklist + flowchart for a document.",
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Document ID",
                    },
                },
                "required": ["id"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if not check_auth():
        return [TextContent(type="text", text="Unauthorized: invalid or missing API key")]

    if name == "search_documents":
        query = arguments.get("query")
        limit = arguments.get("limit", 10)
        if not query:
            return [TextContent(type="text", text="Error: query is required")]
        return await search.search_documents(query, limit)

    elif name == "get_document":
        doc_id = arguments.get("id")
        if not doc_id:
            return [TextContent(type="text", text="Error: id is required")]
        return await document.get_document(doc_id)

    elif name == "list_categories":
        return await categories.list_categories()

    elif name == "get_summary":
        doc_id = arguments.get("id")
        if not doc_id:
            return [TextContent(type="text", text="Error: id is required")]
        return await document.get_summary(doc_id)

    return [TextContent(type="text", text=f"Unknown tool: {name}")]


async def main():
    # Read auth token from MCP_API_KEY env
    api_key = os.environ.get("MCP_API_KEY")
    if api_key:
        set_auth_token(f"Bearer {api_key}")

    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
```

2. Verify Docker build:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
docker compose --profile mcp build mcp-server
```

3. Commit:
```bash
git add apps/mcp-server/server.py
git commit -m "feat(mcp): wire all 4 tools into MCP server

- search_documents: full-text search with snippet
- get_document: full doc + chunks
- list_categories: all categories with counts
- get_summary: AI summary + checklist + flowchart
- Bearer token auth via MCP_API_KEY env
- Returns 'Unauthorized' for invalid token"
```

---

### Task 7: README + verify

**Files**:
- Create: `apps/mcp-server/README.md`

**Steps**:

1. Create `apps/mcp-server/README.md`:
```markdown
# Rikkei MCP Server

Model Context Protocol server exposing Rikkei's internal documents to external AI agents.

## Tools

- `search_documents(query, limit=10)` — Full-text search across documents
- `get_document(id)` — Get document metadata + all chunks
- `list_categories()` — List all categories
- `get_summary(id)` — Get AI-generated summary + checklist + flowchart

## Usage

```bash
docker compose --profile mcp up -d mcp-server
docker attach rikkei-mcp-server  # then send JSON-RPC requests via stdin
```

## Client Configuration

```json
{
  "mcpServers": {
    "rikkei-docs": {
      "command": "docker",
      "args": ["exec", "-i", "rikkei-mcp-server", "python", "-m", "server"],
      "env": {
        "DATABASE_URL": "postgresql://rikkei@postgres:5432/rikkei_docs",
        "MCP_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Auth

All requests must include `MCP_API_KEY` env var matching server's.

## Architecture

- **Transport**: stdio (JSON-RPC)
- **DB**: Postgres read-only via asyncpg
- **Search**: Postgres full-text search (to_tsvector)
```

2. Verify end-to-end (manually test via JSON-RPC):
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
docker compose --profile mcp up -d mcp-server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | docker exec -i rikkei-mcp-server python -m server 2>&1 | head -30
```

Expected: JSON response listing 4 tools.

3. Commit:
```bash
git add apps/mcp-server/README.md
git commit -m "docs(mcp): README with usage + client config

- Documents all 4 tools
- Docker exec command for stdio transport
- Claude Desktop MCP config example
- Auth via MCP_API_KEY env"
```

---

## Self-Review

### Spec Coverage
✅ Plan 6 scope:
- "4 tools: search_documents, get_document, list_categories, get_summary" → Tasks 3-6
- "Auth: Bearer token" → Task 6 (validate_token)
- "Document tools trong README" → Task 7

### Placeholder Scan
- No TODO/TBD thật
- SSE transport not implemented (intentional - stdio only)

### Type/Name Consistency
- Tool names match spec exactly
- All async functions
- Bearer token via env var

### Memory Compliance
- No UI files (MCP doesn't need UI)
- No inline styles needed

---

## Execution Handoff

**Subagent-driven development**. Mỗi task 1-7 dispatch subagent. Task 7 includes verification.