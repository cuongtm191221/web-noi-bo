---
name: mcp-server-lessons
description: Các lỗi và bài học khi implement MCP server với Next.js + Prisma
metadata:
  type: reference
---

# Bài học kinh nghiệm: MCP Server Implementation

## Các lỗi đã gặp

### 1. Prisma Client Model Names (snake_case vs camelCase)

**Vấn đề**: Prisma client giữ nguyên tên model từ schema (snake_case) thay vì chuyển thành camelCase như thông thường.

**Lỗi**:
```
Cannot read properties of undefined (reading 'findUnique')
```

**Nguyên nhân**: Code dùng `prisma.mcpToken.findUnique()` nhưng Prisma giữ tên là `prisma['mcp_tokens']`

**Giải pháp**: Dùng bracket notation
```typescript
// Sai ❌
const mcpTokens = prisma.mcpToken

// Đúng ✅
const mcpTokens = prisma['mcp_tokens']
```

---

### 2. Prisma Field Names (snake_case)

**Vấn đề**: Prisma giữ nguyên tên field từ database (snake_case).

**Lỗi**:
```
Unknown argument `tokenHash`. Did you mean `token_hash`?
```

**Nguyên nhân**: Code dùng `where: { tokenHash: value }` nhưng database dùng `token_hash`

**Giải pháp**: Dùng snake_case cho tất cả field names
```typescript
// Sai ❌
where: { tokenHash: value }
select: { userId: true }

// Đúng ✅
where: { token_hash: value }
select: { user_id: true }
```

---

### 3. Prisma DATASOURCE_URL trong Production

**Vấn đề**: Prisma client không generate đúng models khi không có `DATABASE_URL` trong constructor.

**Lỗi**: 
```
prisma.mcpToken undefined
Has mcpToken: undefined
```

**Nguyên nhân**: Khi Prisma không biết datasource URL, nó không generate đầy đủ models.

**Giải pháp**: Thêm explicit datasource trong PrismaClient
```typescript
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

---

### 4. MCP Transport Type cho Claude Desktop

**Vấn đề**: Claude Desktop hỗ trợ MCP qua HTTP endpoint với `type: "http"`.

**Config đúng**:
```json
{
  "mcpServers": {
    "rikkei-docs": {
      "type": "http",
      "url": "http://vps-ip:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    }
  }
}
```

---

### 5. API Route Path - /api/mcp thay vì /mcp

**Vấn đề**: Claude Desktop cần endpoint `/api/mcp` vì web chạy trên port 3000.

**Cấu hình đúng**:
- Web: `http://vps-ip:3000`
- MCP endpoint: `http://vps-ip:3000/api/mcp`

---

## Checklist khi implement MCP Server mới

```markdown
## Pre-implementation
- [ ] Prisma schema dùng snake_case cho model và field names
- [ ] PrismaClient có datasources.db.url explicit
- [ ] Token auth dùng token_hash (snake_case)

## Implementation  
- [ ] API route tại /api/mcp (POST)
- [ ] Dùng bracket notation: prisma['model_name']
- [ ] Dùng snake_case: where: { field_name: value }
- [ ] Token verification với SHA-256 hash

## Testing
- [ ] Test /api/mcp với curl
- [ ] Test tools/list
- [ ] Test tools/call với mỗi tool
- [ ] Test authentication với invalid token
- [ ] Verify token_hash trong DB match với SHA-256 của plain token
```

---

## Code Template cho MCP Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Dùng bracket notation cho snake_case models
const mcpTokens = prisma['mcp_tokens'] as any;

async function verifyToken(token: string): Promise<string | null> {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  try {
    const result = await mcpTokens.findUnique({
      where: { token_hash: hash },  // snake_case!
      select: { user_id: true },    // snake_case!
    });
    if (result) {
      return result.user_id;
    }
  } catch (e) {
    console.error('Token verify error:', e);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  
  if (!token) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32602, message: 'Missing Authorization header' } },
      { status: 401 }
    );
  }
  
  const userId = await verifyToken(token);
  if (!userId) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32602, message: 'Invalid token' } },
      { status: 401 }
    );
  }
  
  // Handle methods...
}
```

---

**Why**: Khi implement thêm tools MCP trong tương lai, tránh lặp lại các lỗi về Prisma naming conventions.

**How to apply**: Copy checklist và code template khi tạo MCP route mới.
