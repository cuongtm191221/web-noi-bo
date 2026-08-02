"""search_documents MCP tool."""
import json
from mcp.types import TextContent
from db import get_pool


async def search_documents(query: str, limit: int = 10) -> list[TextContent]:
    """Search documents by title + chunk text using Postgres full-text search."""
    pool = await get_pool()

    async with pool.acquire() as conn:
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

        return [TextContent(
            type="text",
            text=json.dumps(results, ensure_ascii=False, indent=2, default=str),
        )]