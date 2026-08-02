# Rikkei Education - Hệ thống quản lý tài liệu nội bộ

Web nội bộ để thầy cô upload tài liệu quy trình/quy định, hệ thống tự động tóm tắt, tạo flowchart, trích dẫn nguồn, render trực tiếp trong browser, và cung cấp MCP server cho agent bên ngoài tra cứu.

## 🎯 Features

- 📄 **Multi-format upload**: PDF, DOCX, PPTX, XLSX, MD, TXT (max 50MB)
- 🤖 **AI auto-processing**: tóm tắt, vẽ flowchart Mermaid, tạo trích dẫn (qwen2.5:7b local)
- 📊 **Inline viewers**: render PDF/DOCX/PPTX/XLSX/MD/TXT ngay trong trang (không cần tải về)
- 🔗 **Citation click-to-source**: click trích dẫn → scroll viewer tới đúng trang
- 📡 **Real-time UX**: badge "Đang xử lý AI..." với polling 5s, không block upload
- 🛠️ **MCP Server**: 4 tools cho external AI agents (search, get_doc, list_categories, get_summary)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **API**: tRPC 11
- **Database**: PostgreSQL 16 (Docker)
- **ORM**: Prisma 6
- **Auth**: Auth.js v5 (Credentials + bcrypt)
- **AI**: Ollama (qwen2.5:7b) + FastAPI + Python parsers
- **MCP**: Python MCP SDK v1.0
- **Viewers**: react-pdf, mammoth, xlsx, react-syntax-highlighter, mermaid, react-markdown

## 📦 Prerequisites

- Node.js 24+
- npm 11+
- Docker + Docker Compose
- Git
- 8GB RAM (Ollama chạy local)

## 🚀 Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd web-noi-bo

# 2. Install dependencies
npm install

# 3. Start core services (Postgres + Web)
docker compose up -d

# 4. Run migrations + seed
npm run db:migrate
npm run db:seed

# 5. (Optional) Start AI services
docker compose --profile ai up -d

# 6. (Optional) Pull Ollama model (~5GB, one-time)
docker compose --profile ai exec ollama ollama pull qwen2.5:7b

# 7. (Optional) Start MCP server
docker compose --profile mcp up -d mcp-server

# 8. Start dev server
npm run dev
```

Visit http://localhost:3000 → login với `admin@rikkei.edu.vn` / `admin123`.

## 🐳 Services (Docker Compose profiles)

| Service | Default | Profile | Port | Purpose |
|---------|---------|---------|------|---------|
| postgres | ✅ | (default) | 5432 | Database |
| web | ✅ | (default) | 3000 | Next.js app |
| ollama | | `ai` | 11434 | LLM runtime |
| ai-pipeline | | `ai` | 8000 | FastAPI AI processor |
| mcp-server | | `mcp` | (stdio) | MCP server for external agents |

## 📜 Available Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # Build production
npm run start            # Start production server
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run test             # Run unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio (port 5555)

# Docker Compose
docker compose up -d                      # Postgres + Web
docker compose --profile ai up -d         # + Ollama + AI pipeline
docker compose --profile mcp up -d        # + MCP server
docker compose --profile ai down          # Stop AI services
```

## 🗂️ Project Structure

```
web-noi-bo/
├── apps/
│   ├── web/                 # Next.js app
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Shared components
│   │   ├── lib/
│   │   │   ├── trpc/        # tRPC routers
│   │   │   ├── auth.ts      # Auth.js config
│   │   │   └── prisma.ts    # Prisma client
│   │   └── prisma/          # Schema + migrations
│   ├── ai-pipeline/         # Python AI service
│   │   ├── parsers/         # PDF/DOCX/PPTX/XLSX parsers
│   │   ├── chunker.py       # Text chunking
│   │   ├── summarizer.py    # Ollama summarization
│   │   ├── flowchart_gen.py # Ollama Mermaid generation
│   │   ├── db.py            # asyncpg client
│   │   └── main.py          # FastAPI server
│   └── mcp-server/          # Python MCP server
│       ├── server.py        # MCP server entry
│       ├── tools/           # 4 MCP tools
│       ├── db.py            # asyncpg read-only client
│       └── auth.py          # Bearer token validation
├── docs/
│   ├── superpowers/
│   │   ├── specs/           # Design docs
│   │   └── plans/           # Implementation plans
│   └── CLAUDE.md            # Project memory
├── docker-compose.yml       # Multi-service orchestration
├── package.json             # npm workspaces
└── README.md                # This file
```

## 🎨 Brand Identity

Toàn bộ UI tuân thủ brand identity Rikkei Education:
- Primary navy: `#0d226b`
- Rikkei blue: `#005c9e`
- Rikkei green: `#009f4d`
- Font: Be Vietnam Pro

## 📊 Implementation Status

| Plan | Status | Description |
|------|--------|-------------|
| Plan 1 | ✅ | Foundation (Docker, Next.js, Prisma, Auth) |
| Plan 2 | ✅ | Document Upload (multi-format) |
| Plan 3 | ✅ | AI Pipeline (FastAPI + Ollama) |
| Plan 4 | ✅ | Mermaid/Summary UI + real-time UX feedback |
| Plan 5 | ✅ | Citation + click-to-source |
| Plan 6 | ✅ | MCP Server (4 tools) |
| Plan 7 | ✅ | Document Viewer (PDF/DOCX/PPTX/XLSX/MD/TXT) |

## 🔌 MCP Server Usage

After starting (`docker compose --profile mcp up -d mcp-server`):

```bash
# Test with JSON-RPC over stdio
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | \
  docker exec -i rikkei-mcp-server python -m server
```

**Claude Desktop / Claude Code MCP config**:
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

**4 Tools available**:
- `search_documents(query, limit=10)` — Postgres full-text search
- `get_document(id)` — Full doc + chunks
- `list_categories()` — All categories with counts
- `get_summary(id)` — AI summary + checklist + flowchart

## 🧪 Development Tips

### Clear database
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "TRUNCATE TABLE citations, document_flowcharts, document_summaries, document_chunks, documents CASCADE;"
```

### Re-process document (re-trigger AI)
```bash
curl -X POST http://localhost:8000/process -H "Content-Type: application/json" \
  -d "{\"document_id\":\"DOC_ID\",\"storage_path\":\"/uploads/DOC_ID.pdf\",\"format\":\"pdf\"}"
```

### Watch AI pipeline logs
```bash
docker compose --profile ai logs ai-pipeline -f
```

### Check DB tables
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "\dt"
```

## ⚠️ Known Limitations

- **PDF scan without text layer**: Empty `executive_summary`. Status kept as `draft` (not `archived`) so user can retry or upload different file.
- **Citation location**: AI may not always return `page_number` (we fall back to chunk's location).
- **Ollama CPU**: First run ~3-5min for summarize+flowchart per document. Subsequent runs faster (cached).
- **XLSX/PDF scroll-to-cell**: Only PDF page highlighting wired in Plan 7. Row/cell highlighting is deferred.

## 📚 Documentation

- [`docs/superpowers/specs/`](./docs/superpowers/specs/) — Design docs
- [`docs/superpowers/plans/`](./docs/superpowers/plans/) — Implementation plans
- [`CLAUDE.md`](./CLAUDE.md) — Project memory + conventions

## 🤝 Contributing

1. Branch off `main`
2. Make changes
3. Run `npm run typecheck && npm run lint`
4. Commit with conventional commit format
5. Push + open PR

## 📝 License

Internal use only — Rikkei Education.