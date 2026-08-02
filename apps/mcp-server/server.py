"""MCP Server for Rikkei Document Management."""
from mcp.server import MCPServer

from tools import search, document, categories

mcp = MCPServer("rikkei-docs-mcp")


@mcp.tool()
async def search_documents(query: str, limit: int = 10) -> str:
    """Search documents by query string. Returns matching documents with snippets.

    Args:
        query: Search query string
        limit: Max results (default 10)
    """
    result = await search.search_documents(query, limit)
    return result[0].text


@mcp.tool()
async def get_document(id: str) -> str:
    """Get full document details including all chunks.

    Args:
        id: Document ID
    """
    result = await document.get_document(id)
    return result[0].text


@mcp.tool()
async def list_categories() -> str:
    """List all document categories with document counts."""
    result = await categories.list_categories()
    return result[0].text


@mcp.tool()
async def get_summary(id: str) -> str:
    """Get AI-generated summary + checklist + flowchart for a document.

    Args:
        id: Document ID
    """
    result = await document.get_summary(id)
    return result[0].text


if __name__ == "__main__":
    mcp.run(transport="stdio")