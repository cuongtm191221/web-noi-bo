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