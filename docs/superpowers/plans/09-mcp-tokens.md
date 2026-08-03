# Plan 9: MCP Token cho User

**Date**: 2026-08-04
**Depends on**: Plan 1-7 ✅
**Priority**: P0

## Goal

User tạo MCP token qua UI → dùng token trong Claude Desktop/Cursor/VS Code để truy vấn docs qua MCP server.

**User flow**:
1. Login → vào `/settings/integrations`
2. Click "Tạo token mới" → nhập name → submit
3. Modal hiển thị token plain-text **một lần duy nhất** + JSON config copy-paste
4. User paste vào Claude Desktop/Cursor config
5. Coding agent kết nối MCP → dùng `search_documents`, `get_document`, etc.

## Architecture

```
User UI (web)
    ↓ POST /api/mcp/tokens
Server (Next.js): generate token, hash (bcrypt), save to DB
    ↓ return plain text once
Modal shows: rik_<user_id>_<random>
    ↓ user copies
External Agent (Claude Desktop / Cursor)
    ↓ stdio + bearer token
MCP Server (Python)
    ↓ token lookup in DB
Postgres (validate token, get userId)
```

## Tasks

### Task 1: Database schema

**Files**:
- Modify: `apps/web/prisma/schema.prisma`

**Steps**:

```prisma
model McpToken {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String   // "Claude Desktop", "Cursor", etc.
  tokenHash   String   @unique // bcrypt hash
  tokenPrefix String   // First 8 chars for display "rik_<userid>_abc12345..."
  createdAt   DateTime @default(now())
  lastUsedAt  DateTime?
  expiresAt   DateTime?

  @@index([userId])
  @@map("mcp_tokens")
}
```

Add relation to User model:
```prisma
model User {
  // ... existing fields
  mcpTokens McpToken[]
}
```

Generate migration:
```bash
cd apps/web
npx prisma migrate dev --name add-mcp-tokens
```

### Task 2: Token generation utility

**Files**:
- Create: `apps/web/lib/mcp-tokens.ts`

```typescript
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const MCP_TOKEN_PREFIX = 'rik_';

export function generateToken(userId: string): { plain: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(24).toString('base64url'); // 32 chars
  const plain = `${MCP_TOKEN_PREFIX}${userId.slice(-8)}_${random}`;
  const hash = bcrypt.hashSync(plain, 10);
  const prefix = plain.slice(0, 16); // "rik_<8chars>"
  return { plain, hash, prefix };
}

export function verifyToken(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function isValidTokenFormat(token: string): boolean {
  return /^rik_[A-Za-z0-9]{8}_[A-Za-z0-9_-]{32,}$/.test(token);
}
```

### Task 3: API endpoints

**Files**:
- Create: `apps/web/app/api/mcp/tokens/route.ts`
- Create: `apps/web/app/api/mcp/tokens/[id]/route.ts`

**POST /api/mcp/tokens**:
```typescript
// Body: { name: string }
// Returns: { token: string (plain, one-time), id, name, createdAt }
```

**GET /api/mcp/tokens**:
```typescript
// Returns: [{ id, name, prefix, createdAt, lastUsedAt }]
```

**DELETE /api/mcp/tokens/[id]**:
```typescript
// Revokes token
```

### Task 4: Settings/Integrations page

**Files**:
- Create: `apps/web/app/(dashboard)/settings/integrations/page.tsx`
- Create: `apps/web/app/(dashboard)/settings/integrations/token-manager.tsx`

**Features**:
- List user's tokens (name, prefix, created, last used)
- Button "Tạo token mới"
- Modal with config JSON (Claude Desktop / Cursor formats)
- Delete button per token

**Claude Desktop config**:
```json
{
  "mcpServers": {
    "rikkei-docs": {
      "command": "docker",
      "args": ["exec", "-i", "rikkei-mcp-server", "python", "-m", "server"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "MCP_TOKEN": "<user-token>"
      }
    }
  }
}
```

**Cursor config**: similar.

### Task 5: MCP server validates via DB

**Files**:
- Modify: `apps/mcp-server/server.py` (or auth.py)

Currently MCP server uses `MCP_API_KEY` env var. Update to:
1. Read `MCP_TOKEN` from env (passed by user's config)
2. Look up in DB via asyncpg
3. Get userId from token
4. Optionally filter tools by userId (for future per-user doc access)

For MVP: just verify token exists and is valid.

### Task 6: Test

- Create token via UI
- Copy config
- Run test:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize",...}' | docker exec -i rikkei-mcp-server env MCP_TOKEN=<token> python -m server
```
- Verify `search_documents` returns docs

### Task 7: Commit

```bash
git add apps/web/prisma/schema.prisma
git add apps/web/lib/mcp-tokens.ts
git add apps/web/app/api/mcp/
git add apps/web/app/\(dashboard\)/settings/
git commit -m "feat(mcp): user-managed tokens for external agent connections (Plan 9)"
```

## Self-Review

- Token format: `rik_<userid8>_<random32>` → easy to identify user
- Hashed in DB (bcrypt 10 rounds) → secure
- Plain text shown once → can't be retrieved later
- Last-used tracking → useful for user
- Revocable → user can disable compromised tokens
- Backward compatible: env `MCP_API_KEY` still works (admin token)

## Self-Review Checklist
- [ ] DRY: token format centralized
- [ ] No TODOs left
- [ ] Type safe
- [ ] Plain token never returned after creation
- [ ] UI shows clear setup instructions