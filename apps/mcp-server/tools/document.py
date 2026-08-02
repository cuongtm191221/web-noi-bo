"""get_document and get_summary MCP tools."""
import json
from mcp.types import TextContent
from db import get_pool


async def get_document(doc_id: str) -> list[TextContent]:
    """Get document metadata + chunks."""
    pool = await get_pool()

    async with pool.acquire() as conn:
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

        checklist = row["checklist"]
        if isinstance(checklist, str):
            try:
                checklist = json.loads(checklist)
            except json.JSONDecodeError:
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