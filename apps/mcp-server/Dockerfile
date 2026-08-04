FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

COPY pyproject.toml .

RUN uv pip install --system .

COPY . .

# Default: stdio for Claude Desktop (local Docker)
# Set MCP_TRANSPORT=http for production VPS
ENV MCP_TRANSPORT=${MCP_TRANSPORT:-stdio}
ENV MCP_PORT=${MCP_PORT:-8765}

CMD ["sh", "-c", "if [ \"$MCP_TRANSPORT\" = 'http' ]; then uvicorn server_http:app --host 0.0.0.0 --port $MCP_PORT; else python -m server; fi"]
