"""Bearer token validation for MCP requests.

Supports two modes:
1. Admin token via env var MCP_API_KEY (backward compatible)
2. Per-user token via MCP_TOKEN (validated against Postgres, SHA-256)
"""
import os
import hashlib
import logging
from typing import Optional

from db import get_pool

logger = logging.getLogger(__name__)


def _validate_admin_token(token: str) -> bool:
    """Validate against admin token from env var."""
    admin_token = os.environ.get("MCP_API_KEY")
    if not admin_token:
        return False
    return token == admin_token


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def validate_token(token: Optional[str]) -> bool:
    """Sync validation (legacy). Returns True if admin env token matches.

    For per-user tokens, use validate_token_async (returns userId).
    """
    if not token:
        return False
    if token.startswith("Bearer "):
        token = token[len("Bearer "):]
    return _validate_admin_token(token)


async def validate_token_async(token: Optional[str]) -> Optional[dict]:
    """Validate Bearer token against DB or env.

    Returns:
        {"userId": str} on success, None on failure.
        Admin env token returns {"userId": "admin"}.
    """
    if not token:
        return None
    if token.startswith("Bearer "):
        token = token[len("Bearer "):]

    if _validate_admin_token(token):
        return {"userId": "admin"}

    pool = get_pool()
    if pool is None:
        logger.error("DB pool not available for token validation")
        return None

    token_hash = _hash_token(token)
    try:
        row = await pool.fetchrow(
            """
            SELECT t.user_id, u.email
            FROM mcp_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token_hash = $1
              AND (t.expires_at IS NULL OR t.expires_at > NOW())
            """,
            token_hash,
        )
        if row:
            # Update last_used_at (fire and forget)
            try:
                await pool.execute(
                    "UPDATE mcp_tokens SET last_used_at = NOW() WHERE token_hash = $1",
                    token_hash,
                )
            except Exception:
                pass
            return {"userId": row["user_id"], "email": row["email"]}
    except Exception as e:
        logger.error(f"Token validation failed: {e}")

    return None