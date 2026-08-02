# Rikkei MCP Server

Model Context Protocol server exposing Rikkei's internal documents to external AI agents.

## Tools

- `search_documents(query, limit=10)` — Full-text search across documents
- `get_document(id)` — Get document metadata + all chunks
- `list_categories()` — List all categories
- `get_summary(id)` — Get AI-generated summary + checklist + flowchart

## Usage

Start the server:
```bash
docker compose --profile mcp up -d mcp-server
```

Send JSON-RPC requests via stdin:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  docker exec -i rikkei-mcp-server python -m server
```

## Client Configuration

Claude Desktop / Claude Code MCP config:
```json
{
  "mcpServers": {
    "rikkei-docs": {
      "command": "docker",
      "args": ["exec", "-i", "rikkei-mcp-server", "python", "-m", "server"],
      "env": {
        "DATABASE_URL": "postgresql://rikkei:password@host:5432/rikkei_docs",
        "MCP_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Auth

All requests must include `MCP_API_KEY` env var matching the server's.

## Architecture

- **Transport**: stdio (JSON-RPC)
- **DB**: Postgres read-only via asyncpg
- **Search**: Postgres full-text search (to_tsvector)