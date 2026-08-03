# Plan 1: Foundation — Rikkei Education Web Nội Bộ

**Date**: 2026-07-31
**Spec**: [`docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`](../specs/2026-07-31-internal-document-mgmt-design.md)

## Execution Handoff

> **REQUIRED SUB-SKILL**: Use **subagent-driven-development** (theo user đã chọn).
> Mỗi task dưới đây được thực hiện bởi subagent MỚI với 2 vòng review:
> 1. Spec compliance — code có match spec không?
> 2. Code quality — DRY, YAGNI, có test không?
>
> Inline execution KHÔNG được dùng cho plan này.

---

## Goal

App Next.js 15 chạy được với login flow hoàn chỉết, có PostgreSQL qua Docker, áp dụng Rikkei Education brand identity. End deliverable: user đăng nhập được với seeded admin account và thấy dashboard trống (placeholder) với logo + sidebar Rikkei Education.

## Architecture (từ spec section 6)

Monorepo npm workspaces 3 apps (`web`, `ai-pipeline`, `mcp-server`) — Plan 1 chỉ implement `apps/web`. Docker Compose có 4 services (postgres, ollama, ai-pipeline, mcp-server) nhưng Plan 1 chỉ start `postgres`.

## Tech Stack (Plan 1 scope)

| Layer | Tech |
|-------|------|
| Monorepo | npm workspaces (Node 24) |
| Web | Next.js 15 + TypeScript 5 + Tailwind v4 + shadcn/ui |
| API | tRPC 11 |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 (Docker) |
| Auth | Auth.js v5 + Credentials Provider + bcrypt |
| Test | Vitest (unit) + Playwright (e2e) |

## Global Constraints (copy từ spec)

1. **DRY, YAGNI, TDD, frequent commits.** Mỗi task 1 commit.
2. **Rikkei Education branding** phải được apply từ đầu — không dùng màu mặc định Tailwind.
3. **Test phải viết trước code.** Code viết trước test sẽ bị xóa.
4. **Không hardcode strings** magic — config trong env hoặc constants.
5. **Async/await đúng cách** — không fire-and-forget, error handling đầy đủ.
6. **Tên file/folder dùng kebab-case** (trừ Next.js convention `page.tsx`, `layout.tsx`).

---

## File Structure (Plan 1 scope)

```
web-noi-bo/
├── .gitignore                          # CREATE
├── .env.example                        # CREATE
├── .nvmrc                              # CREATE (node 24)
├── package.json                        # CREATE (workspaces root)
├── package-lock.json                   # auto-generated
├── tsconfig.base.json                  # CREATE (shared TS config)
├── docker-compose.yml                  # CREATE (postgres only this plan)
├── README.md                           # CREATE
├── CLAUDE.md                           # ALREADY EXISTS (project memory)
├── docs/
│   └── superpowers/
│       ├── specs/2026-07-31-internal-document-mgmt-design.md   # ALREADY EXISTS
│       └── plans/01-foundation.md      # ← file này
├── apps/
│   └── web/
│       ├── package.json                # CREATE
│       ├── tsconfig.json               # CREATE
│       ├── next.config.ts              # CREATE
│       ├── tailwind.config.ts          # CREATE
│       ├── postcss.config.mjs          # CREATE
│       ├── components.json             # CREATE (shadcn config)
│       ├── .env                        # CREATE (gitignored)
│       ├── .env.local                  # CREATE (gitignored)
│       ├── prisma/
│       │   ├── schema.prisma           # CREATE
│       │   └── migrations/             # auto-generated
│       ├── public/
│       │   ├── rikkei-logo.svg         # CREATE (download từ qlrikkeiedu.web.app)
│       │   └── favicon.svg             # CREATE (copy of rikkei-logo.svg)
│       ├── app/
│       │   ├── layout.tsx              # CREATE
│       │   ├── page.tsx                # CREATE (redirect → /dashboard/documents)
│       │   ├── globals.css             # CREATE (Rikkei theme tokens)
│       │   ├── (auth)/
│       │   │   └── login/
│       │   │       └── page.tsx        # CREATE
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx          # CREATE (sidebar + main layout)
│       │   │   └── documents/
│       │   │       └── page.tsx        # CREATE (empty list placeholder)
│       │   └── api/
│       │       ├── auth/[...nextauth]/route.ts   # CREATE
│       │       └── trpc/[trpc]/route.ts          # CREATE
│       ├── components/
│       │   ├── ui/                     # shadcn-generated
│       │   ├── sidebar.tsx             # CREATE (Rikkei brand)
│       │   ├── logo.tsx                # CREATE
│       │   └── sign-out-button.tsx     # CREATE
│       ├── lib/
│       │   ├── auth.ts                 # CREATE (Auth.js config)
│       │   ├── auth-helpers.ts         # CREATE (password hashing)
│       │   ├── prisma.ts               # CREATE (Prisma client singleton)
│       │   ├── env.ts                  # CREATE (env validation)
│       │   ├── utils.ts                # CREATE (cn helper, etc.)
│       │   └── trpc/
│       │       ├── server.ts           # CREATE (tRPC init)
│       │       ├── client.tsx          # CREATE (React Query client)
│       │       └── routers/
│       │           ├── _app.ts         # CREATE (root router)
│       │           ├── auth.ts         # CREATE (me procedure)
│       │           └── health.ts       # CREATE (health check)
│       └── tests/
│           ├── unit/
│           │   ├── auth-helpers.test.ts
│           │   └── env.test.ts
│           └── e2e/
│               └── login.spec.ts
└── scripts/
    └── seed.ts                         # CREATE (seed admin user)
```

**Total files created in Plan 1**: ~30 files.

---

## Tasks

Tasks are bite-sized (2-5 phút mỗi step). Mỗi task có file paths chính xác, code đầy đủ, test code, commit message.

---

### Task 1: Initialize Git Repository + .gitignore

**Files**:
- Create: `.gitignore`
- Create: `.nvmrc`

**Interfaces**:
- Consumes: nothing
- Produces: empty git repo at root with proper .gitignore

**Steps**:

1. Run `git init` in `web-noi-bo/`
2. Create `.gitignore`:
```gitignore
# Dependencies
node_modules/
.pnpm-store/
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.venv/
venv/
env/

# Next.js
.next/
out/
build/
dist/

# Production
*.tsbuildinfo
next-env.d.ts

# Misc
.DS_Store
*.pem
.vscode/
.idea/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env
.env*.local
.env.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo

# Prisma
prisma/*.db
prisma/*.db-journal

# Uploads (user files)
apps/web/uploads/
!apps/web/uploads/.gitkeep

# Backups
backups/
*.sql.gz

# Test
coverage/
playwright-report/
test-results/

# Docker
.docker/

# OS
Thumbs.db

# Turbo
.turbo

# Python
*.egg-info/
.pytest_cache/
.mypy_cache/
.ruff_cache/
```

3. Create `.nvmrc`:
```
24
```

4. Create `apps/web/uploads/.gitkeep` (empty file):
```bash
mkdir -p apps/web/uploads && touch apps/web/uploads/.gitkeep
```

5. Verify: `git status` should show only `.gitignore`, `.nvmrc`, and `apps/web/uploads/.gitkeep` as untracked.

**Commit**: `chore: initialize git repo with .gitignore`

---

### Task 2: Create Root package.json (npm workspaces)

**Files**:
- Create: `package.json`
- Create: `tsconfig.base.json`

**Interfaces**:
- Consumes: nothing
- Produces: workspaces config + shared TS config

**Steps**:

1. Create `package.json` at root:
```json
{
  "name": "rikkei-edu-web-noi-bo",
  "version": "0.1.0",
  "private": true,
  "description": "Web nội bộ quản lý tài liệu quy trình - Rikkei Education",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=apps/web",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "db:migrate": "npm run db:migrate --workspace=apps/web",
    "db:seed": "npm run db:seed --workspace=apps/web",
    "db:studio": "npm run db:studio --workspace=apps/web"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=24.0.0",
    "npm": ">=11.0.0"
  }
}
```

2. Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "allowSyntheticDefaultImports": true
  }
}
```

3. Run `npm install` to initialize `node_modules/` and `package-lock.json`.

4. Verify: `npm ls --workspaces` shows root with no children yet.

**Commit**: `chore: setup npm workspaces root with shared TS config`

---

### Task 3: Create docker-compose.yml (Postgres only)

**Files**:
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces**:
- Consumes: nothing
- Produces: working `docker compose up postgres` command

**Steps**:

1. Create `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: rikkei-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-rikkei}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-rikkei_dev_password}
      POSTGRES_DB: ${POSTGRES_DB:-rikkei_docs}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-rikkei} -d ${POSTGRES_DB:-rikkei_docs}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Placeholder for future plans
  ollama:
    image: ollama/ollama:latest
    container_name: rikkei-ollama
    profiles: ["ai"]  # Only start when --profile ai
    restart: unless-stopped
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "${OLLAMA_PORT:-11434}:11434"

  ai-pipeline:
    build:
      context: ./apps/ai-pipeline
    container_name: rikkei-ai-pipeline
    profiles: ["ai"]
    restart: unless-stopped
    depends_on:
      ollama:
        condition: service_started
    environment:
      OLLAMA_HOST: http://ollama:11434
    ports:
      - "${AI_PIPELINE_PORT:-8000}:8000"

  mcp-server:
    build:
      context: ./apps/mcp-server
    container_name: rikkei-mcp-server
    profiles: ["mcp"]
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-rikkei}:${POSTGRES_PASSWORD:-rikkei_dev_password}@postgres:5432/${POSTGRES_DB:-rikkei_docs}
      MCP_API_KEY: ${MCP_API_KEY:-changeme_mcp_api_key}
    ports:
      - "${MCP_PORT:-8765}:8765"

volumes:
  postgres_data:
    name: rikkei_postgres_data
  ollama_data:
    name: rikkei_ollama_data
```

2. Create `scripts/init.sql`:
```sql
-- Enable extensions needed for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Grant all to user (Postgres 16 superuser already has access, but explicit for clarity)
GRANT ALL PRIVILEGES ON DATABASE rikkei_docs TO rikkei;
```

3. Create `.env.example`:
```bash
# Database
POSTGRES_USER=rikkei
POSTGRES_PASSWORD=rikkei_dev_password
POSTGRES_DB=rikkei_docs
POSTGRES_PORT=5432

# AI (Plan 3+)
OLLAMA_PORT=11434
AI_PIPELINE_PORT=8000

# MCP (Plan 6+)
MCP_PORT=8765
MCP_API_KEY=changeme_mcp_api_key

# Auth (Plan 1 - generated secret)
AUTH_SECRET=replace_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

4. Run `docker compose up -d postgres` and verify it's healthy:
```bash
docker compose ps
# Should show postgres as "healthy" after ~10s
```

5. Test connection from host:
```bash
docker exec -it rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT version();"
# Should show PostgreSQL 16.x
```

**Commit**: `chore: add docker-compose with Postgres + placeholders for ai/mcp`

---

### Task 4: Create .env + .env.local for apps/web

**Files**:
- Create: `apps/web/.env`
- Create: `apps/web/.env.local`
- Create: `apps/web/lib/env.ts`
- Create: `apps/web/tests/unit/env.test.ts`

**Interfaces**:
- Consumes: `.env.example` template
- Produces: validated env object accessible in code

**Steps**:

1. **Test first** — create `apps/web/tests/unit/env.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { env } from '../../lib/env';

describe('env', () => {
  it('loads DATABASE_URL', () => {
    expect(env.DATABASE_URL).toBeTruthy();
    expect(env.DATABASE_URL).toMatch(/^postgresql:\/\//);
  });

  it('loads AUTH_SECRET as non-empty string', () => {
    expect(env.AUTH_SECRET).toBeTruthy();
    expect(env.AUTH_SECRET.length).toBeGreaterThan(20);
  });

  it('loads NEXTAUTH_URL', () => {
    expect(env.NEXTAUTH_URL).toMatch(/^https?:\/\//);
  });

  it('parses numeric port correctly', () => {
    expect(typeof env.PORT).toBe('number');
    expect(env.PORT).toBeGreaterThan(0);
  });
});
```

2. Run test to verify it FAILS:
```bash
cd apps/web && npm run test -- env.test.ts
# Should fail: "Cannot find module '../../lib/env'"
```

3. Create `apps/web/lib/env.ts`:
```ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  AUTH_SECRET: z.string().min(20),
  NEXTAUTH_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables. See logs above.');
}

export const env = parsed.data;
```

4. Install zod: `npm install zod --workspace=apps/web`

5. Create `apps/web/.env` (committed via .env.example pattern, but values here):
```bash
DATABASE_URL=postgresql://rikkei:rikkei_dev_password@localhost:5432/rikkei_docs
AUTH_SECRET=dev_secret_change_in_production_min_32_chars_long
NEXTAUTH_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

6. Create `apps/web/.env.local` (gitignored override):
```bash
# Same as .env for now - dev values
DATABASE_URL=postgresql://rikkei:rikkei_dev_password@localhost:5432/rikkei_docs
AUTH_SECRET=dev_secret_change_in_production_min_32_chars_long
NEXTAUTH_URL=http://localhost:3000
```

7. Run test again to verify PASSES:
```bash
cd apps/web && npm run test -- env.test.ts
```

**Commit**: `feat(env): add zod-validated env config with unit tests`

---

### Task 5: Scaffold Next.js 15 with TypeScript + Tailwind + shadcn

**Files**:
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/components.json`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/lib/utils.ts`

**Interfaces**:
- Consumes: root `package.json` workspaces config
- Produces: Next.js app that renders at `localhost:3000` with Rikkei theme

**Steps**:

1. Create `apps/web/package.json`:
```json
{
  "name": "@rikkei/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx scripts/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "@auth/core": "^0.37.0",
    "@auth/prisma-adapter": "^2.7.0",
    "next-auth": "5.0.0-beta.25",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "@trpc/server": "^11.0.0",
    "@trpc/client": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@tanstack/react-query": "^5.59.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^22.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.0",
    "prisma": "^6.0.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "@playwright/test": "^1.48.0"
  }
}
```

2. Create `apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "incremental": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "dist"]
}
```

3. Create `apps/web/next.config.ts`:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // tRPC 11 requires this for App Router
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Allow tRPC + Prisma
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
```

4. Create `apps/web/postcss.config.mjs`:
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

5. Create `apps/web/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0d226b',
          hover: '#07154b',
        },
        'rikkei-blue': '#005c9e',
        'rikkei-green': '#009f4d',
        'bg-cream': '#f2f7ff',
        'text-dark': '#1e293b',
        'text-muted': '#64748b',
        border: '#e2e8f0',
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', 'Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
```

6. Create `apps/web/components.json` (shadcn config):
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

7. Create `apps/web/lib/utils.ts`:
```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

8. Create `apps/web/app/globals.css` (Rikkei theme + Tailwind v4):
```css
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import "tailwindcss";

@theme {
  --color-primary: #0d226b;
  --color-primary-hover: #07154b;
  --color-rikkei-blue: #005c9e;
  --color-rikkei-green: #009f4d;
  --color-bg-cream: #f2f7ff;
  --color-text-dark: #1e293b;
  --color-text-muted: #64748b;
  --color-border: #e2e8f0;

  --font-sans: 'Be Vietnam Pro', Inter, 'Plus Jakarta Sans', sans-serif;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

:root {
  --primary: #0d226b;
  --primary-hover: #07154b;
  --rikkei-blue: #005c9e;
  --rikkei-green: #009f4d;
  --bg-cream: #f2f7ff;
  --bg-sidebar: #ffffff;
  --text-dark: #1e293b;
  --text-muted: #64748b;
  --border-color: #e2e8f0;
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: var(--font-sans);
}

html,
body {
  height: 100%;
}

body {
  background-color: var(--bg-cream);
  color: var(--text-dark);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 14px;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

9. Create `apps/web/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rikkei Education - Hệ thống quản lý tài liệu',
  description: 'Hệ thống nội bộ quản lý tài liệu quy trình, quy định',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
```

10. Create `apps/web/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/documents');
}
```

11. Install dependencies:
```bash
cd apps/web && npm install
```

12. Verify dev server starts:
```bash
cd apps/web && npm run dev
# Should show "Ready in..." on http://localhost:3000
# Visiting localhost:3000 redirects to /documents (will 404, but redirect works)
```

13. Verify typecheck passes:
```bash
cd apps/web && npm run typecheck
```

14. Verify lint passes:
```bash
cd apps/web && npm run lint
```

**Commit**: `feat(web): scaffold Next.js 15 with Rikkei Education theme`

---

### Task 6: Create Prisma Schema (User, Category, Document skeleton)

**Files**:
- Create: `apps/web/prisma/schema.prisma`

**Interfaces**:
- Consumes: `DATABASE_URL` from env
- Produces: database tables for User, Category (Document schema sẽ ở Plan 2)

**Steps**:

1. Create `apps/web/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  admin
  editor
  viewer
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String   @map("password_hash")
  name          String
  role          Role     @default(viewer)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Category {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  parentId  String?  @map("parent_id")
  parent    Category?  @relation("CategoryToParent", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryToParent")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("categories")
}
```

2. Run initial migration:
```bash
cd apps/web && npx prisma migrate dev --name init_users_categories
# This creates the migration and applies it
```

3. Verify migration succeeded:
```bash
docker exec -it rikkei-postgres psql -U rikkei -d rikkei_docs -c "\dt"
# Should show: users, categories, _prisma_migrations
```

4. Generate Prisma client:
```bash
cd apps/web && npx prisma generate
```

5. Verify generated client exists in `node_modules/.prisma/client/`.

**Commit**: `feat(db): add Prisma schema with User + Category tables`

---

### Task 7: Create Prisma Client Singleton

**Files**:
- Create: `apps/web/lib/prisma.ts`

**Interfaces**:
- Consumes: Prisma client generated
- Produces: singleton PrismaClient for the app

**Steps**:

1. Create `apps/web/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

2. Verify typecheck:
```bash
cd apps/web && npm run typecheck
```

**Commit**: `feat(db): add Prisma client singleton`

---

### Task 8: Create Password Hashing Helpers (with tests)

**Files**:
- Create: `apps/web/lib/auth-helpers.ts`
- Create: `apps/web/tests/unit/auth-helpers.test.ts`

**Interfaces**:
- Consumes: bcryptjs
- Produces: `hashPassword` and `verifyPassword` functions

**Steps**:

1. **Test first** — create `apps/web/tests/unit/auth-helpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../lib/auth-helpers';

describe('auth-helpers', () => {
  it('hashes password to non-empty string', async () => {
    const hash = await hashPassword('mySecret123');
    expect(hash).toBeTruthy();
    expect(hash).not.toEqual('mySecret123');
    expect(hash.length).toBeGreaterThan(40);
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword('correctPassword');
    const result = await verifyPassword('correctPassword', hash);
    expect(result).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const hash = await hashPassword('correctPassword');
    const result = await verifyPassword('wrongPassword', hash);
    expect(result).toBe(false);
  });

  it('produces different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword('same');
    const hash2 = await hashPassword('same');
    expect(hash1).not.toEqual(hash2);
    // But both verify
    expect(await verifyPassword('same', hash1)).toBe(true);
    expect(await verifyPassword('same', hash2)).toBe(true);
  });
});
```

2. Run test to verify FAILS:
```bash
cd apps/web && npm run test -- auth-helpers.test.ts
```

3. Create `apps/web/lib/auth-helpers.ts`:
```ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

4. Run test again to verify PASSES.

**Commit**: `feat(auth): add password hashing helpers with bcrypt and tests`

---

### Task 9: Create Auth.js v5 Configuration

**Files**:
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`

**Interfaces**:
- Consumes: Prisma, auth-helpers, env
- Produces: Auth.js config with Credentials provider

**Steps**:

1. Create `apps/web/lib/auth.ts`:
```ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from './prisma';
import { verifyPassword } from './auth-helpers';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'editor' | 'viewer';
      }
      return session;
    },
  },
});
```

2. Create `apps/web/types/next-auth.d.ts` to extend Session type:
```ts
import 'next-auth';

declare module 'next-auth' {
  interface User {
    role: 'admin' | 'editor' | 'viewer';
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'editor' | 'viewer';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'editor' | 'viewer';
  }
}
```

3. Create `apps/web/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

4. Verify typecheck:
```bash
cd apps/web && npm run typecheck
```

**Commit**: `feat(auth): add Auth.js v5 with Credentials provider`

---

### Task 10: Create Login Page (with Rikkei styling)

**Files**:
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/components/logo.tsx`

**Interfaces**:
- Consumes: Auth.js `signIn` function, Rikkei theme
- Produces: Login form at `/login`

**Steps**:

1. Create `apps/web/components/logo.tsx`:
```tsx
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Image
        src="/rikkei-logo.svg"
        alt="Rikkei Education"
        width={40}
        height={40}
        className="h-10 w-auto"
        priority
      />
      <span className="font-bold text-lg text-primary">Rikkei Education</span>
    </div>
  );
}
```

2. Create `apps/web/app/(auth)/login/page.tsx`:
```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/documents';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email hoặc mật khẩu không đúng.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-cream px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <h1 className="text-2xl font-bold text-primary mb-2">Đăng nhập</h1>
        <p className="text-sm text-text-muted mb-6">
          Hệ thống quản lý tài liệu nội bộ Rikkei Education
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-rikkei-blue"
              placeholder="admin@rikkei.edu.vn"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-1">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-rikkei-blue"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded-md transition-all disabled:opacity-50"
          >
            {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="text-xs text-text-muted mt-6 text-center">
          Liên hệ admin để được cấp tài khoản
        </p>
      </div>
    </div>
  );
}
```

3. Add `next-auth/react` to deps (if not already):
```bash
cd apps/web && npm list next-auth
# Should be installed
```

4. Verify typecheck:
```bash
cd apps/web && npm run typecheck
```

**Commit**: `feat(auth): add login page with Rikkei Education theme`

---

### Task 11: Create Dashboard Layout (Sidebar + Main)

**Files**:
- Create: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/components/sidebar.tsx`
- Create: `apps/web/components/sign-out-button.tsx`
- Create: `apps/web/app/(dashboard)/documents/page.tsx`

**Interfaces**:
- Consumes: Auth.js `auth` for session, Logo component
- Produces: Dashboard shell with sidebar (Rikkei brand) and main content area

**Steps**:

1. Create `apps/web/components/sign-out-button.tsx`:
```tsx
'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm text-text-muted hover:text-primary transition-colors"
    >
      Đăng xuất
    </button>
  );
}
```

2. Create `apps/web/components/sidebar.tsx`:
```tsx
import Link from 'next/link';
import { FileText, FolderTree, Users, Activity } from 'lucide-react';
import { Logo } from './logo';
import { SignOutButton } from './sign-out-button';
import type { Session } from 'next-auth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'editor' | 'viewer'>;
};

const navItems: NavItem[] = [
  { href: '/documents', label: 'Tài liệu', icon: FileText, roles: ['admin', 'editor', 'viewer'] },
  { href: '/categories', label: 'Danh mục', icon: FolderTree, roles: ['admin'] },
  { href: '/admin/users', label: 'Người dùng', icon: Users, roles: ['admin'] },
  { href: '/admin/audit-logs', label: 'Audit log', icon: Activity, roles: ['admin'] },
];

export function Sidebar({ session }: { session: Session }) {
  const role = session.user.role;
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-[270px] h-screen bg-white border-r border-border fixed left-0 top-0 flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-dark hover:bg-bg-cream hover:text-primary transition-all"
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-border">
        <div className="text-sm font-semibold">{session.user.name}</div>
        <div className="text-xs text-text-muted mb-2">{session.user.email}</div>
        <SignOutButton />
      </div>
    </aside>
  );
}
```

3. Create `apps/web/app/(dashboard)/layout.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-bg-cream">
      <Sidebar session={session} />
      <main className="ml-[270px] p-6">
        {children}
      </main>
    </div>
  );
}
```

4. Create `apps/web/app/(dashboard)/documents/page.tsx` (empty placeholder):
```tsx
export default function DocumentsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-2">Tài liệu</h1>
      <p className="text-text-muted mb-6">Danh sách tài liệu quy trình và quy định</p>

      <div className="bg-white rounded-lg shadow-sm p-8 text-center text-text-muted">
        <FileText className="w-12 h-12 mx-auto mb-3 text-border" />
        <p>Chưa có tài liệu nào. Upload tính năng sẽ có ở Plan 2.</p>
      </div>
    </div>
  );
}

import { FileText } from 'lucide-react';
```

5. Verify typecheck:
```bash
cd apps/web && npm run typecheck
```

**Commit**: `feat(dashboard): add sidebar layout with Rikkei Education branding`

---

### Task 12: Setup tRPC

**Files**:
- Create: `apps/web/lib/trpc/server.ts`
- Create: `apps/web/lib/trpc/client.tsx`
- Create: `apps/web/lib/trpc/routers/_app.ts`
- Create: `apps/web/lib/trpc/routers/auth.ts`
- Create: `apps/web/lib/trpc/routers/health.ts`
- Create: `apps/web/app/api/trpc/[trpc]/route.ts`

**Interfaces**:
- Consumes: Auth.js session, Prisma
- Produces: tRPC server + client with health check + auth.me procedure

**Steps**:

1. Create `apps/web/lib/trpc/server.ts`:
```ts
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const createTRPCContext = async () => {
  const session = await auth();
  return { session, prisma };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
```

2. Install superjson:
```bash
cd apps/web && npm install superjson
```

3. Create `apps/web/lib/trpc/routers/health.ts`:
```ts
import { createTRPCRouter, publicProcedure } from '../server';
import { prisma } from '@/lib/prisma';

export const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
});
```

4. Create `apps/web/lib/trpc/routers/auth.ts`:
```ts
import { createTRPCRouter, protectedProcedure } from '../server';

export const authRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.session.user;
  }),
});
```

5. Create `apps/web/lib/trpc/routers/_app.ts`:
```ts
import { createTRPCRouter } from '../server';
import { healthRouter } from './health';
import { authRouter } from './auth';

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

6. Create `apps/web/lib/trpc/client.tsx`:
```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';
import type { AppRouter } from './routers/_app';

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
  }));
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

7. Create `apps/web/app/api/trpc/[trpc]/route.ts`:
```ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routers/_app';
import { createTRPCContext } from '@/lib/trpc/server';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
```

8. Wrap root layout with `TRPCProvider` — update `apps/web/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/client';

export const metadata: Metadata = {
  title: 'Rikkei Education - Hệ thống quản lý tài liệu',
  description: 'Hệ thống nội bộ quản lý tài liệu quy trình, quy định',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
```

9. Verify typecheck + dev server still works:
```bash
cd apps/web && npm run typecheck
cd apps/web && npm run dev
# Visit http://localhost:3000 → redirect /documents → /login (since not authed)
```

**Commit**: `feat(api): setup tRPC with health check and auth.me procedures`

---

### Task 13: Create Seed Script (admin user + sample categories)

**Files**:
- Create: `apps/web/scripts/seed.ts`

**Interfaces**:
- Consumes: Prisma, env
- Produces: 1 admin user + 3 categories in database

**Steps**:

1. Create `apps/web/scripts/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin user
  const adminEmail = 'admin@rikkei.edu.vn';
  const adminPassword = 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Admin Rikkei',
      role: 'admin',
    },
  });

  console.log(`✅ Admin user: ${admin.email} / ${adminPassword}`);

  // Seed categories
  const categories = [
    { name: 'Quy trình học vụ', slug: 'quy-trinh-hoc-vu' },
    { name: 'Quy chế thi đua', slug: 'quy-che-thi-dua' },
    { name: 'Hướng dẫn sử dụng', slug: 'huong-dan-su-dung' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log(`✅ ${categories.length} categories created`);
  console.log('🌱 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

2. Run seed:
```bash
cd apps/web && npm run db:seed
```

3. Verify in DB:
```bash
docker exec -it rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT email, role FROM users;"
docker exec -it rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT name, slug FROM categories;"
```

**Commit**: `feat(db): seed admin user + sample categories`

---

### Task 14: Create Login E2E Test (Playwright)

**Files**:
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests/e2e/login.spec.ts`

**Interfaces**:
- Consumes: Playwright
- Produces: E2E test that validates full login flow

**Steps**:

1. Create `apps/web/playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

2. Create `apps/web/tests/e2e/login.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in with valid admin credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@rikkei.edu.vn');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/documents/);
    await expect(page.locator('h1')).toContainText('Tài liệu');
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@rikkei.edu.vn');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Email hoặc mật khẩu không đúng')).toBeVisible();
  });
});
```

3. Install Playwright browsers:
```bash
cd apps/web && npx playwright install chromium
```

4. Run E2E test (dev server must be up — Playwright config starts it):
```bash
cd apps/web && npm run test:e2e
```

5. Verify all 3 tests pass.

**Commit**: `test(auth): add Playwright E2E tests for login flow`

---

### Task 15: Create README.md

**Files**:
- Create: `README.md` (root)

**Interfaces**:
- Consumes: nothing
- Produces: Project README for developers

**Steps**:

1. Create `README.md`:
```markdown
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
```

2. Verify content:
```bash
cat README.md | head -30
```

**Commit**: `docs: add README with setup instructions`

---

### Task 16: Final Verification (All tests + lint + typecheck + manual smoke test)

**Files**: none (verification task)

**Interfaces**:
- Consumes: all code from Plan 1
- Produces: confidence that Plan 1 is complete

**Steps**:

1. Run all unit tests:
```bash
cd apps/web && npm run test
# Should show: env.test.ts + auth-helpers.test.ts both pass
```

2. Run E2E tests:
```bash
cd apps/web && npm run test:e2e
# Should show: 3 login.spec.ts tests pass
```

3. Run typecheck:
```bash
cd apps/web && npm run typecheck
# Should exit 0
```

4. Run lint:
```bash
cd apps/web && npm run lint
# Should exit 0 (warnings allowed)
```

5. Manual smoke test:
```bash
# Start fresh
docker compose down -v
docker compose up -d postgres
cd apps/web && npm run db:migrate
cd apps/web && npm run db:seed
npm run dev

# In browser:
# 1. Visit http://localhost:3000 → redirect to /documents
# 2. Not authenticated → redirect to /login
# 3. Login with admin@rikkei.edu.vn / admin123
# 4. Should see /documents with empty state + sidebar with Rikkei logo
# 5. Logout works
```

6. Verify all deliverables present:
```bash
ls -la docker-compose.yml package.json CLAUDE.md README.md
ls -la apps/web/prisma/schema.prisma apps/web/lib/auth.ts apps/web/app/globals.css
```

**Commit**: No commit (verification task only).

---

## Self-Review

### Spec Coverage
✅ Mỗi yêu cầu trong spec section 1.4 (Foundation success criteria) đã map tới ≥1 task:
- "App Next.js chạy được" → Task 5, 11
- "PostgreSQL qua Docker" → Task 3
- "Auth.js với login" → Task 8, 9, 10
- "Rikkei Education theme" → Task 5 (globals.css, tailwind.config), Task 10, 11

### Placeholder Scan
✅ Không có "TODO", "TBD", "implement later". Mọi file path cụ thể.

### Type/Name Consistency
- `apps/web/lib/prisma.ts` → `prisma` export, dùng nhất quán.
- `apps/web/lib/auth.ts` → `auth, signIn, signOut, handlers` exports.
- `apps/web/lib/trpc/routers/_app.ts` → `appRouter` typed export.
- Prisma model names PascalCase, fields camelCase với `@map` cho snake_case DB.
- CSS variables `--primary`, `--rikkei-blue` match Tailwind config.

### File Paths
✅ Tất cả paths dùng `apps/web/` prefix (đúng theo monorepo). Tasks tham chiếu files tồn tại từ Task trước.

---

## Execution Handoff

**Subagent-driven development** đã được user chọn.

Mỗi task từ 1-15 sẽ được dispatch subagent mới với:
- Task number + description từ plan này.
- Context: đọc CLAUDE.md + spec doc.
- 2 vòng review (spec compliance + code quality).
- Báo cáo lại kết quả trước khi dispatch task tiếp theo.

Task 16 (verification) sẽ chạy trực tiếp bởi main loop sau khi tất cả subagents hoàn thành.