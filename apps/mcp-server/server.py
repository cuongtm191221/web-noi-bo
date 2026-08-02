"""MCP Server for Rikkei Document Management."""
import asyncio
import os
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