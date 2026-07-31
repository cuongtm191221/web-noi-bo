# CLAUDE.md — Memory cho Claude Code sessions

> **Project**: Web nội bộ quản lý tài liệu quy trình/quy định — Rikkei Education
> **Owner**: Rikkei Education
> **Started**: 2026-07-31
> **Spec location**: `docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`
> **Plans location**: `docs/superpowers/plans/`

---

## Project Overview

Hệ thống nội bộ để thầy cô upload tài liệu quy trình/quy định, hệ thống tự động:
1. **Tóm tắt** (executive summary + checklist các bước) bằng AI local.
2. **Tạo flowchart Mermaid** trực quan từ nội dung.
3. **Trích dẫn nguồn** (citation) — click citation → viewer scroll tới đúng vị trí gốc.
4. **Xuất MCP server** để agent bên ngoài (Claude, custom) tra cứu tài liệu.

**Quy mô**: < 50 thầy cô, miễn phí, tự host. Multi-format: PDF, DOCX, XLSX, PPTX, MD, TXT.

---

## Tech Stack (đã chốt)

| Layer | Tech |
|-------|------|
| Monorepo | npm workspaces (Node 24) |
| Web | Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui |
| API | tRPC 11 |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 (Docker, named volume) |
| Auth | Auth.js v5 (Credentials + bcrypt) |
| AI Pipeline | FastAPI (Python 3.11) + Ollama `qwen2.5:7b` (Docker) |
| MCP Server | Python mcp SDK + SSE transport |
| Flowchart | Mermaid (client-side) |
| Container | Docker Compose toàn bộ stack |

**Xem chi tiết tại section 5 trong spec doc.**

---

## Brand Identity (Rikkei Education) — QUAN TRỌNG

Toàn bộ UI phải tuân thủ brand identity từ [https://qlrikkeiedu.web.app/](https://qlrikkeiedu.web.app/):

### Color Palette (CSS variables trong `apps/web/app/globals.css`)
```css
:root {
  --primary: #0d226b;        /* Navy — primary buttons, headings */
  --primary-hover: #07154b;
  --rikkei-blue: #005c9e;    /* Links, breadcrumbs */
  --rikkei-green: #009f4d;   /* Success badges */
  --bg-cream: #f2f7ff;       /* Main background */
  --bg-sidebar: #ffffff;
  --text-dark: #1e293b;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
}
```

### Typography
- **Be Vietnam Pro** (Vietnamese-friendly, weights 300-900) — load Google Fonts.
- Fallback: Inter, Plus Jakarta Sans, Segoe UI, sans-serif.
- Body: 14px antialiased. H1: 36px/800. H2: 30px/800. H3: 20px/700.

### Layout Pattern
- **Sidebar trái 270px fixed** + main content (cards, tables).
- Sidebar có logo Rikkei Education + menu điều hướng.
- Mobile: sidebar collapse thành drawer.

### Design Rules
- Border radius: 8px button, 12px card, 16px modal, 9999px pill.
- Shadow: subtle (rgba 0.05).
- Transition: `cubic-bezier(0.4, 0, 0.2, 1)`.

**Brand assets**:
- `apps/web/public/rikkei-logo.svg` — Extract từ site gốc.
- `apps/web/public/favicon.svg` — Favicon dùng Rikkei logo.

**KHÔNG tự ý thay đổi logo hoặc màu sắc brand** mà không có approval.

---

## Directory Structure

```
web-noi-bo/
├── .git/
├── .gitignore
├── .env.example
├── .nvmrc                          # node 24
├── package.json                    # npm workspaces root
├── docker-compose.yml              # postgres + ollama + ai-pipeline + mcp-server
├── README.md
├── CLAUDE.md                       # ← file này
├── docs/
│   └── superpowers/
│       ├── specs/2026-07-31-internal-document-mgmt-design.md
│       └── plans/
│           ├── 01-foundation.md
│           ├── 02-document-upload.md
│           ├── 03-ai-pipeline.md
│           ├── 04-flowchart.md
│           ├── 05-citation.md
│           ├── 06-mcp-server.md
│           └── 07-polish-deploy.md
├── apps/
│   ├── web/                        # Next.js 15
│   ├── ai-pipeline/                # FastAPI
│   └── mcp-server/                 # Python MCP
└── scripts/
    ├── seed.ts
    ├── backup-pg.sh
    ├── ollama-pull.sh
    └── example-mcp-client.py
```

---

## Conventions

### Branch naming
- `plan-1-foundation`, `plan-2-upload`, etc.

### Commit message
- **Conventional Commits**: `feat(upload): add dropzone component`.
- Commit thường xuyên, mỗi task 1 commit.

### Workflow per plan (theo superpowers)
1. **writing-plans** skill — viết plan file chi tiết.
2. **using-git-worktrees** — tạo worktree isolated.
3. **test-driven-development** — test trước, code sau.
4. **subagent-driven-development** — dispatch subagent mỗi task + 2 vòng review.
5. **requesting-code-review** — trước khi merge.
6. **verification-before-completion** — verify test pass.
7. **finishing-a-development-branch** — merge worktree.

---

## Commands quan trọng

```bash
# Dev
docker compose up -d postgres          # Start Postgres only
docker compose up -d                   # Start all services
npm run dev                            # Start Next.js (apps/web)
cd apps/ai-pipeline && uvicorn app.main:app --reload  # AI service

# Database
cd apps/web && npx prisma migrate dev
cd apps/web && npx prisma studio

# Tests
npm test                               # All tests
cd apps/web && npm run test:e2e       # Playwright

# Lint
npm run lint
cd apps/web && npm run typecheck
```

---

## Current State — Plan 1 (Foundation)

**Status**: SPEC APPROVED, writing plan file
**Goal**: App Next.js chạy được với login, có PostgreSQL qua Docker, Rikkei Education theme.

**Critical files** (theo spec section 14):
1. `docker-compose.yml`
2. `package.json` (root workspaces)
3. `apps/web/prisma/schema.prisma`
4. `apps/web/lib/auth.ts`
5. `apps/web/app/globals.css` (Rikkei theme tokens)

---

## Key Decisions (kèm lý do)

| Decision | Choice | Lý do |
|----------|--------|-------|
| Monorepo | npm workspaces | Không cần cài pnpm, tận dụng Node 24 sẵn |
| ORM | Prisma 6 | TypeScript-first, migration tooling tốt |
| Auth | Auth.js v5 + Credentials + bcrypt | Không phụ thuộc external, đơn giản |
| AI model | Ollama qwen2.5:7b | Hiểu tiếng Việt tốt, ~4.5GB, open-source |
| MCP transport | SSE | Linh hoạt cho remote agent, fallback stdio |
| Storage | Local filesystem apps/web/uploads/ | MVP đơn giản, scale S3 sau |
| Search | PostgreSQL tsvector + ILIKE | Native, không cần Elasticsearch |
| API | tRPC | End-to-end type safety, không OpenAPI riêng |

---

## Plugins cần thiết cho Claude Code

```
/plugin marketplace add obra/superpowers
/plugin install superpowers
```

Cài xong, các skills sẽ auto-trigger.

---

## Notes cho phiên sau

- **Mất mạng vẫn phát triển tiếp**: workspace lưu local, git tracked, memories persist.
- Project này dùng **Spec-Driven Development** theo [obra/superpowers](https://github.com/obra/superpowers).
- Khi mở phiên mới, đọc spec doc + plan hiện tại + `git log` là có đủ context.
- User đã duyệt spec doc ngày 2026-07-31. Từ đó về sau, scope thay đổi phải update spec doc trước.
