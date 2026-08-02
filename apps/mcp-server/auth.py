"""Bearer token validation for MCP requests."""
import os
from typing import Optional

MCP_API_KEY = os.environ.get(
    "MCP_API_KEY",
    "dev_mcp_api_key_change_in_prod",
)


def validate_token(token: Optional[str]) -> bool:
    """Validate Bearer token from MCP client."""
    if not token:
        return False
    # Strip "Bearer " prefix if present
    if token.startswith("Bearer "):
        token = token[len("Bearer "):]
    return token == MCP_API_KEY