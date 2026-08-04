"""MCP Server for Rikkei Document Management."""
from mcp.server import Server

from tools import search, document, categories

server = Server("rikkei-docs-mcp")


@server.list_tools()
async def list_tools():
    """List available tools."""
    return [
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


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    """Handle tool calls."""
    if name == "search_documents":
        result = await search.search_documents(arguments["query"], arguments.get("limit", 10))
        return [{"type": "text", "text": result[0].text}]
    elif name == "get_document":
        result = await document.get_document(arguments["id"])
        return [{"type": "text", "text": result[0].text}]
    elif name == "list_categories":
        result = await categories.list_categories()
        return [{"type": "text", "text": result[0].text}]
    elif name == "get_summary":
        result = await document.get_summary(arguments["id"])
        return [{"type": "text", "text": result[0].text}]
    else:
        raise ValueError(f"Unknown tool: {name}")


if __name__ == "__main__":
    from mcp.server.stdio import stdio_server

    async def main():
        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                server.create_initialization_options(),
            )

    import asyncio
    asyncio.run(main())
