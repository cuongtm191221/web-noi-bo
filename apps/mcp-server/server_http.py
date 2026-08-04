"""
MCP HTTP Server for Rikkei Document Management.

This server exposes MCP tools via HTTP POST endpoint for remote agents.
Authentication: Bearer token in Authorization header.

Usage:
    # Development (with docker)
    MCP_TRANSPORT=http MCP_PORT=8765 python server_http.py

    # Or use uvicorn
    MCP_PORT=8765 uvicorn server_http:app --host 0.0.0.0 --port 8765
"""
import os
import json
import asyncio
import hashlib
from datetime import datetime
from typing import Optional

import asyncpg
from fastapi import FastAPI, Request, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Database config
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://rikkei:rikkei_dev_password@localhost:5432/rikkei_docs"
)

app = FastAPI(title="Rikkei MCP HTTP Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# MCP Protocol Models
class MCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[str | int] = None
    method: str
    params: Optional[dict] = None


class MCPResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[str | int] = None
    result: Optional[dict | list | str] = None
    error: Optional[dict] = None


# Database helpers
async def get_db_pool():
    """Get database connection pool."""
    if not hasattr(get_db_pool, '_pool'):
        get_db_pool._pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=1,
            max_size=5,
        )
    return get_db_pool._pool


async def verify_token(token: str) -> Optional[str]:
    """Verify MCP token and return user_id if valid."""
    pool = await get_db_pool()
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT user_id FROM mcp_tokens
            WHERE token_hash = $1
            AND (expires_at IS NULL OR expires_at > NOW())
            """,
            token_hash
        )

        if row:
            # Update last used
            await conn.execute(
                "UPDATE mcp_tokens SET last_used_at = NOW() WHERE token_hash = $1",
                token_hash
            )
            return row['user_id']

    return None


# MCP Tool Handlers
async def handle_list_tools() -> dict:
    """Return list of available tools."""
    return {
        "tools": [
            {
                "name": "search_documents",
                "description": "Search documents by query string. Returns matching documents with snippets.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query string"},
                        "limit": {"type": "integer", "description": "Max results", "default": 10},
                    },
                    "required": ["query"],
                },
            },
            {
                "name": "get_document",
                "description": "Get full document details including all chunks.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Document ID"},
                    },
                    "required": ["id"],
                },
            },
            {
                "name": "list_categories",
                "description": "List all document categories with document counts.",
                "inputSchema": {"type": "object", "properties": {}},
            },
            {
                "name": "get_summary",
                "description": "Get AI-generated summary + checklist + flowchart for a document.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "Document ID"},
                    },
                    "required": ["id"],
                },
            },
        ]
    }


async def handle_search_documents(pool, query: str, limit: int = 10) -> str:
    """Search documents."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, title, category_id, created_at,
                   LEFT(content_text, 200) as snippet
            FROM documents
            WHERE status = 'published'
            AND (
                title ILIKE $1
                OR content_text ILIKE $1
            )
            ORDER BY updated_at DESC
            LIMIT $2
            """,
            f"%{query}%",
            limit
        )

        if not rows:
            return f"Không tìm thấy tài liệu nào cho từ khóa: {query}"

        results = []
        for i, row in enumerate(rows, 1):
            results.append(
                f"[{i}] {row['title']}\n"
                f"    ID: {row['id']}\n"
                f"    Snippet: {row['snippet']}...\n"
            )

        return f"Tìm thấy {len(rows)} tài liệu:\n\n" + "\n".join(results)


async def handle_get_document(pool, doc_id: str) -> str:
    """Get document details."""
    async with pool.acquire() as conn:
        doc = await conn.fetchrow(
            """
            SELECT d.*, c.name as category_name,
                   u.name as author_name
            FROM documents d
            LEFT JOIN categories c ON d.category_id = c.id
            LEFT JOIN users u ON d.created_by = u.id
            WHERE d.id = $1
            """,
            doc_id
        )

        if not doc:
            return f"Không tìm thấy tài liệu với ID: {doc_id}"

        # Get chunks
        chunks = await conn.fetch(
            "SELECT page_number, content_text FROM document_chunks WHERE document_id = $1 ORDER BY page_number",
            doc_id
        )

        result = [
            f"Tài liệu: {doc['title']}",
            f"ID: {doc['id']}",
            f"Trạng thái: {doc['status']}",
            f"Tác giả: {doc['author_name'] or 'N/A'}",
            f"Danh mục: {doc['category_name'] or 'N/A'}",
            f"Tạo: {doc['created_at']}",
            f"Cập nhật: {doc['updated_at']}",
            "",
            f"Nội dung ({len(chunks)} phần):",
        ]

        for chunk in chunks[:5]:  # Limit to first 5 chunks
            result.append(f"\n--- Phần {chunk['page_number']} ---")
            result.append(chunk['content_text'][:500] + "..." if len(chunk['content_text']) > 500 else chunk['content_text'])

        return "\n".join(result)


async def handle_list_categories(pool) -> str:
    """List all categories."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT c.id, c.name, c.color, COUNT(d.id) as doc_count
            FROM categories c
            LEFT JOIN documents d ON c.id = d.category_id AND d.status = 'published'
            GROUP BY c.id, c.name, c.color
            ORDER BY c.name
            """
        )

        if not rows:
            return "Chưa có danh mục nào."

        result = ["Danh mục tài liệu:\n"]
        for row in rows:
            color = row['color'] or '#666'
            result.append(f"- [{color}] {row['name']}: {row['doc_count']} tài liệu")

        return "\n".join(result)


async def handle_get_summary(pool, doc_id: str) -> str:
    """Get document summary."""
    async with pool.acquire() as conn:
        summary = await conn.fetchrow(
            """
            SELECT executive_summary, checklist, flowchart_mermaid
            FROM document_summaries
            WHERE document_id = $1
            """,
            doc_id
        )

        if not summary:
            return f"Tài liệu {doc_id} chưa có tóm tắt. Vui lòng chờ AI xử lý."

        result = [
            "=== TÓM TẮT ===",
            summary['executive_summary'] or "Không có tóm tắt.",
            "",
            "=== CHECKLIST ===",
            summary['checklist'] or "Không có checklist.",
            "",
            "=== FLOWCHART ===",
            "```mermaid",
            summary['flowchart_mermaid'] or "# Không có flowchart",
            "```",
        ]

        return "\n".join(result)


async def handle_call_tool(pool, name: str, arguments: dict) -> dict:
    """Handle tool call."""
    if name == "search_documents":
        result = await handle_search_documents(pool, arguments.get("query", ""), arguments.get("limit", 10))
        return {"content": [{"type": "text", "text": result}]}

    elif name == "get_document":
        result = await handle_get_document(pool, arguments.get("id", ""))
        return {"content": [{"type": "text", "text": result}]}

    elif name == "list_categories":
        result = await handle_list_categories(pool)
        return {"content": [{"type": "text", "text": result}]}

    elif name == "get_summary":
        result = await handle_get_summary(pool, arguments.get("id", ""))
        return {"content": [{"type": "text", "text": result}]}

    else:
        raise ValueError(f"Unknown tool: {name}")


# Auth dependency
async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> str:
    """Authenticate request via Bearer token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization format. Use: Bearer <token>")

    token = authorization[7:]  # Remove "Bearer " prefix
    user_id = await verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user_id


# Routes
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "rikkei-mcp-http"}


@app.post("/mcp")
async def mcp_endpoint(
    request: Request,
    user_id: str = Depends(get_current_user),
):
    """Handle MCP JSON-RPC requests."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    method = body.get("method")
    request_id = body.get("id")
    params = body.get("params") or {}

    pool = await get_db_pool()

    try:
        if method == "tools/list":
            result = await handle_list_tools()
            return {"jsonrpc": "2.0", "id": request_id, "result": result}

        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments") or {}
            result = await handle_call_tool(pool, tool_name, arguments)
            return {"jsonrpc": "2.0", "id": request_id, "result": result}

        elif method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {"listChanged": False}
                    },
                    "serverInfo": {
                        "name": "rikkei-docs-mcp",
                        "version": "1.0.0"
                    }
                }
            }

        elif method in ["notifications/initialized", "ping"]:
            return {"jsonrpc": "2.0", "id": request_id}

        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }

    except ValueError as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32602,
                "message": str(e)
            }
        }
    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        }


# Run with uvicorn
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("MCP_PORT", "8765"))
    uvicorn.run(
        "server_http:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )
