"""list_categories MCP tool."""
import json
from mcp.types import TextContent
from db import get_pool


async def list_categories() -> list[TextContent]:
    """List all document categories with parent + document counts."""
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