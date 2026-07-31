# Rikkei Education - Hệ thống quản lý tài liệu nội bộ

Web nội bộ để thầy cô upload tài liệu quy trình/quy định, hệ thống tự động tóm tắt, tạo flowchart, trích dẫn nguồn, và xuất MCP server cho agent bên ngoài tra cứu.

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **API**: tRPC 11
- **Database**: PostgreSQL 16 (Docker)
- **ORM**: Prisma 6
- **Auth**: Auth.js v5 (Credentials + bcrypt)
- **AI**: Ollama + FastAPI (Plan 3+)
- **MCP**: Python SDK (Plan 6+)

## Prerequisites

- Node.js 24+
- npm 11+
- Docker + Docker Compose
- Git

## Quick Start

```bash
# 1. Clone
git clone <repo-url>
cd web-noi-bo

# 2. Install dependencies
npm install

# 3. Setup env
cp .env.example .env
cp apps/web/.env.example apps/web/.env  # or create manually

# 4. Start Postgres
docker compose up -d postgres

# 5. Run migrations + seed
npm run db:migrate
npm run db:seed

# 6. Start dev server
npm run dev
```

Visit http://localhost:3000 → login với `admin@rikkei.edu.vn` / `admin123`.

## Available Commands

```bash
npm run dev              # Start Next.js
npm run build            # Build production
npm test                 # Run all unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run lint             # Lint code
npm run typecheck        # TypeScript check
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
```

## Project Structure

Xem [CLAUDE.md](./CLAUDE.md) cho chi tiết về tech stack, brand identity, conventions.

Xem [docs/superpowers/specs/](./docs/superpowers/specs/) cho design doc và [docs/superpowers/plans/](./docs/superpowers/plans/) cho implementation plans.

## Brand Identity

Toàn bộ UI tuân thủ brand identity Rikkei Education (xem [CLAUDE.md](./CLAUDE.md) section "Brand Identity"):
- Primary navy `#0d226b`
- Rikkei blue `#005c9e`
- Rikkei green `#009f4d`
- Font: Be Vietnam Pro

## Current Status

**Plan 1 (Foundation)**: ✅ Complete
**Plan 2 (Document Upload)**: Pending
**Plan 3 (AI Pipeline)**: Pending
...