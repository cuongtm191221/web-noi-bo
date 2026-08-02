import asyncpg
import os
import json
from typing import List, Dict, Any
from chunker import Chunk

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://rikkei@postgres:5432/rikkei_docs",
)

_pool = None


async def get_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    return _pool


async def save_chunks(document_id: str, chunks: List[Chunk]) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Delete existing chunks for this document
        await conn.execute(
            "DELETE FROM document_chunks WHERE document_id = $1",
            document_id,
        )
        # Insert new
        for chunk in chunks:
            await conn.execute(
                """
                INSERT INTO document_chunks
                (id, document_id, chunk_index, text,
                 page_number, slide_number, sheet_name, row_number,
                 token_count, created_at)
                VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
                """,
                document_id,
                chunk.chunk_index,
                chunk.text,
                chunk.location.get("page_number"),
                chunk.location.get("slide_number"),
                chunk.location.get("sheet_name"),
                chunk.location.get("row_number"),
                chunk.token_count,
            )


async def save_summary(document_id: str, summary: Dict[str, Any], model: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO document_summaries
            (id, document_id, executive_summary, checklist, model_used, created_at)
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
            ON CONFLICT (document_id) DO UPDATE SET
              executive_summary = EXCLUDED.executive_summary,
              checklist = EXCLUDED.checklist,
              model_used = EXCLUDED.model_used,
              created_at = NOW()
            """,
            document_id,
            summary.get("executive_summary", ""),
            json.dumps(summary.get("checklist", [])),
            model,
        )


async def save_flowchart(document_id: str, mermaid: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO document_flowcharts
            (id, document_id, mermaid_syntax, created_at)
            VALUES (gen_random_uuid()::text, $1, $2, NOW())
            ON CONFLICT (document_id) DO UPDATE SET
              mermaid_syntax = EXCLUDED.mermaid_syntax,
              created_at = NOW()
            """,
            document_id,
            mermaid,
        )


async def save_citations(document_id: str, citations: List[Dict[str, Any]]) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Delete old citations
        await conn.execute(
            "DELETE FROM citations WHERE document_id = $1",
            document_id,
        )
        # Get chunk IDs by index + location
        chunk_rows = await conn.fetch(
            """
            SELECT id, chunk_index, page_number, slide_number, sheet_name, row_number
            FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index
            """,
            document_id,
        )
        chunk_index_to_info = {
            row["chunk_index"]: dict(row) for row in chunk_rows
        }

        for idx, cit in enumerate(citations):
            chunk_index = cit.get("chunk_index", 0)
            chunk_info = chunk_index_to_info.get(chunk_index)
            if not chunk_info:
                continue
            chunk_id = chunk_info["id"]
            # Inherit location from chunk if not in citation
            page_number = cit.get("page_number") or chunk_info["page_number"]
            slide_number = cit.get("slide_number") or chunk_info["slide_number"]
            sheet_name = cit.get("sheet_name") or chunk_info["sheet_name"]
            row_number = cit.get("row_number") or chunk_info["row_number"]
            await conn.execute(
                """
                INSERT INTO citations
                (id, document_id, chunk_id, claim_text,
                 page_number, slide_number, sheet_name, row_number, column_letter,
                 "order", created_at)
                VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                """,
                document_id,
                chunk_id,
                cit.get("claim", ""),
                page_number,
                slide_number,
                sheet_name,
                row_number,
                cit.get("column_letter"),
                idx,
            )


async def update_document_status(document_id: str, status: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2",
            status,
            document_id,
        )