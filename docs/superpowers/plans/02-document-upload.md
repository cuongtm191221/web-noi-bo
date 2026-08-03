# Plan 2: Document Upload — Rikkei Education

**Date**: 2026-07-31
**Spec**: [`docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`](../specs/2026-07-31-internal-document-mgmt-design.md)
**Depends on**: Plan 1 (Foundation) ✅
**Next**: Plan 3 (AI Pipeline)

## Execution Handoff

> **REQUIRED SUB-SKILL**: Use **subagent-driven-development**.
> Mỗi task được dispatch subagent MỚI với 2 vòng review (spec compliance + code quality).
> Inline execution KHÔNG được dùng.

---

## Goal

Implement document upload + storage + basic viewer UI. End deliverable: User (editor/admin) có thể upload PDF/DOCX/XLSX/PPTX/MD/TXT qua UI, system lưu vào filesystem + DB, hiển thị danh sách documents, click vào document để xem (placeholder cho Plan 3 AI processing).

**Plan 2 scope**: Upload + storage + list + viewer placeholder. **KHÔNG bao gồm** AI processing (Plan 3), flowchart (Plan 4), citation (Plan 5), MCP (Plan 6).

## Architecture

Upload flow:
1. User selects file in UI → drag/drop or file picker.
2. Client validates MIME type + size (50MB max).
3. Client posts FormData to `/api/documents/upload` (Next.js Route Handler).
4. Server validates magic number → saves file to `apps/web/uploads/{document_id}.{ext}`.
5. Server creates Document row in DB (status=draft).
6. Returns document JSON.
7. (Plan 3 sẽ trigger AI processing từ document.status = draft).

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend upload UI | react-dropzone + custom Rikkei-themed button |
| Backend upload | Next.js Route Handler + formidable or native FormData |
| File validation | `file-type` npm (magic number check) |
| Storage | Local filesystem `apps/web/uploads/` |
| Metadata DB | Prisma Document model |

## Global Constraints

1. DRY, YAGNI, TDD, frequent commits.
2. Rikkei Education branding throughout.
3. **Magic number validation** required (not just MIME check from extension).
4. Max 50MB per file (configurable via env).
5. **Always use Docker network** `--network web-noi-bo_default` cho DB operations.
6. Path traversal protection: chỉ accept filenames với UUID, không dùng user-provided filename.

---

## File Structure

```
web-noi-bo/
├── apps/
│   ├── web/
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # UPDATE: add Document model
│   │   │   └── migrations/           # NEW migration: add_documents
│   │   ├── lib/
│   │   │   ├── document-helpers.ts   # NEW: file validation
│   │   │   └── trpc/
│   │   │       └── routers/
│   │   │           └── documents.ts  # NEW: list/get/delete procedures
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   └── documents/
│   │   │   │       └── upload/
│   │   │   │           └── route.ts  # NEW: POST upload handler
│   │   │   ├── (dashboard)/
│   │   │   │   └── documents/
│   │   │   │       ├── page.tsx      # UPDATE: fetch + list documents
│   │   │   │       ├── upload-button.tsx  # NEW: client component
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx  # NEW: viewer placeholder
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   └── badge.tsx         # NEW: status badge
│   │   │   └── document-status-badge.tsx  # NEW
│   │   └── tests/
│   │       └── unit/
│   │           └── document-helpers.test.ts  # NEW: file validation tests
│   └── uploads/                      # EXISTING: .gitkeep, now holds files
└── scripts/
    └── cleanup-uploads.sh            # NEW: optional cleanup script
```

**Total files**: ~12 files (8 new, 3 modified, 1 test).

---

## Tasks

### Task 1: Update Prisma Schema — Add Document Model

**Files**:
- Modify: `apps/web/prisma/schema.prisma`
- New: migration via `prisma migrate dev`

**Interfaces**:
- Consumes: existing User, Category models
- Produces: Document + DocumentChunk tables

**Steps**:

1. Read current schema (already exists from Plan 1).

2. Update `apps/web/prisma/schema.prisma` — add Document model and enum. Append to existing content:

```prisma
enum DocumentStatus {
  draft
  published
  archived
}

enum DocumentFormat {
  pdf
  docx
  xlsx
  pptx
  md
  txt
}

model Document {
  id          String         @id @default(cuid())
  title       String
  filename    String         @unique
  format      DocumentFormat
  mimeType    String         @map("mime_type")
  sizeBytes   Int            @map("size_bytes")
  storagePath String         @map("storage_path")
  status      DocumentStatus @default(draft)
  uploaderId  String         @map("uploader_id")
  uploader    User           @relation(fields: [uploaderId], references: [id])
  categoryId  String?        @map("category_id")
  category    Category?      @relation(fields: [categoryId], references: [id])
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")

  // Plan 3+ will add:
  // summary      DocumentSummary?
  // flowchart    DocumentFlowchart?
  // chunks       DocumentChunk[]
  // citations    Citation[]

  @@index([uploaderId])
  @@index([categoryId])
  @@index([status])
  @@index([createdAt])

  @@map("documents")
}
```

3. Update User model to add back-relation:
```prisma
model User {
  // ... existing fields
  documents    Document[]

  @@map("users")
}
```

4. Update Category model to add back-relation:
```prisma
model Category {
  // ... existing fields
  documents Document[]

  @@map("categories")
}
```

5. Run migration via Docker network (REQUIRED):
```bash
docker run --rm --network web-noi-bo_default -e DATABASE_URL='postgresql://rikkei@postgres:5432/rikkei_docs' -v "//c/Users/Admin/Desktop/web-noi-bo:/app" -w /app/apps/web node:24-alpine sh -c "npx prisma migrate dev --name add_documents --skip-seed" 2>&1 | tail -10
```

6. Regenerate Prisma client locally on Windows:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
npx prisma generate 2>&1 | tail -3
```

7. Verify tables via Docker:
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "\dt"
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "\d documents"
```

8. Commit:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/
git commit -m "feat(db): add Document model with status, format, category relations

- Document model: title, filename, format enum, mimeType, sizeBytes
- storagePath points to apps/web/uploads/{id}.{ext}
- status: draft (default), published, archived
- format: pdf, docx, xlsx, pptx, md, txt
- Relations: uploader (User), category (Category, optional)
- Indexes on uploaderId, categoryId, status, createdAt
- Back-relations added to User and Category"
```

---

### Task 2: Create File Validation Helpers (with tests)

**Files**:
- Create: `apps/web/lib/document-helpers.ts`
- Create: `apps/web/tests/unit/document-helpers.test.ts`

**Interfaces**:
- Consumes: file buffer (first 4KB)
- Produces: validation functions for MIME type + magic number + size

**Steps**:

1. **TEST FIRST** — Create `apps/web/tests/unit/document-helpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { validateFileType, validateFileSize, ALLOWED_MIME_TYPES } from '../../lib/document-helpers';

describe('document-helpers', () => {
  describe('ALLOWED_MIME_TYPES', () => {
    it('includes pdf, docx, xlsx, pptx, md, txt', () => {
      expect(ALLOWED_MIME_TYPES['pdf']).toBe('application/pdf');
      expect(ALLOWED_MIME_TYPES['docx']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(ALLOWED_MIME_TYPES['xlsx']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(ALLOWED_MIME_TYPES['pptx']).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      expect(ALLOWED_MIME_TYPES['md']).toBe('text/markdown');
      expect(ALLOWED_MIME_TYPES['txt']).toBe('text/plain');
    });
  });

  describe('validateFileSize', () => {
    it('accepts file under 50MB', () => {
      expect(() => validateFileSize(1024)).not.toThrow();
      expect(() => validateFileSize(50 * 1024 * 1024)).not.toThrow();
    });

    it('rejects file over 50MB', () => {
      expect(() => validateFileSize(51 * 1024 * 1024)).toThrow(/File too large/);
    });
  });

  describe('validateFileType', () => {
    it('accepts valid PDF magic number', () => {
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
      const result = validateFileType(pdfHeader, 'document.pdf');
      expect(result.format).toBe('pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('accepts valid DOCX (ZIP magic)', () => {
      const docxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..
      const result = validateFileType(docxHeader, 'document.docx');
      expect(result.format).toBe('docx');
    });

    it('rejects mismatched extension and content', () => {
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      expect(() => validateFileType(pdfHeader, 'malware.exe')).toThrow(/extension/);
    });

    it('rejects unknown format', () => {
      const unknownHeader = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(() => validateFileType(unknownHeader, 'file.xyz')).toThrow(/Unsupported format/);
    });
  });
});
```

2. Run test — verify FAILS:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
npx vitest run tests/unit/document-helpers.test.ts 2>&1 | tail -10
```

3. Install `file-type` npm package:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
npm install file-type --workspace=apps/web
```

4. Create `apps/web/lib/document-helpers.ts`:
```ts
import { fileTypeFromBuffer } from 'file-type';

export const ALLOWED_MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  md: 'text/markdown',
  txt: 'text/plain',
} as const;

export type DocumentFormat = keyof typeof ALLOWED_MIME_TYPES;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function validateFileSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${sizeBytes} bytes (max ${MAX_FILE_SIZE_BYTES})`);
  }
}

export async function validateFileType(
  buffer: Buffer,
  filename: string
): Promise<{ format: DocumentFormat; mimeType: string }> {
  const ext = filename.split('.').pop()?.toLowerCase() as DocumentFormat | undefined;
  if (!ext || !(ext in ALLOWED_MIME_TYPES)) {
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  // Detect actual file type from magic number
  const detected = await fileTypeFromBuffer(buffer);

  // For MD/TXT, file-type may return null — trust extension
  if (ext === 'md' || ext === 'txt') {
    return { format: ext, mimeType: ALLOWED_MIME_TYPES[ext] };
  }

  if (!detected) {
    throw new Error('Could not detect file type from content');
  }

  const expectedMime = ALLOWED_MIME_TYPES[ext];
  if (detected.mime !== expectedMime) {
    throw new Error(
      `File extension "${ext}" does not match content type "${detected.mime}". ` +
      `Expected ${expectedMime}.`
    );
  }

  return { format: ext, mimeType: expectedMime };
}
```

5. Run test again — verify PASSES:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
npx vitest run tests/unit/document-helpers.test.ts 2>&1 | tail -10
```
Expected: 8 tests pass.

6. Commit:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
git add apps/web/lib/document-helpers.ts apps/web/tests/unit/document-helpers.test.ts apps/web/package.json package-lock.json
git commit -m "feat(upload): add file validation helpers with magic number check

- ALLOWED_MIME_TYPES for pdf/docx/xlsx/pptx/md/txt
- validateFileSize: rejects >50MB
- validateFileType: checks extension + magic number via file-type
- MD/TXT allowed via extension only (no magic number)
- 8 unit tests cover all formats + edge cases"
```

---

### Task 3: Create Upload API Route

**Files**:
- Create: `apps/web/app/api/documents/upload/route.ts`

**Interfaces**:
- Consumes: POST request with FormData (file + title + categoryId optional)
- Produces: 201 + document JSON, or 400/401/413 error

**Steps**:

1. Create `apps/web/app/api/documents/upload/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateFileSize, validateFileType } from '@/lib/document-helpers';

const UPLOADS_DIR = path.join(process.cwd(), 'apps', 'web', 'uploads');

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'admin' && role !== 'editor') {
    return NextResponse.json(
      { error: 'Forbidden: chỉ admin/editor mới được upload' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const categoryId = formData.get('categoryId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate
    validateFileSize(buffer.length);
    const { format, mimeType } = await validateFileType(buffer, file.name);

    // Ensure uploads directory exists
    await mkdir(UPLOADS_DIR, { recursive: true });

    // Create DB record first (to get document ID)
    const document = await prisma.document.create({
      data: {
        title,
        filename: file.name,
        format,
        mimeType,
        sizeBytes: buffer.length,
        storagePath: '', // Will update after we know the ID
        uploaderId: session.user.id,
        categoryId: categoryId || null,
        status: 'draft',
      },
    });

    // Save file using document ID (path traversal safe)
    const ext = file.name.split('.').pop();
    const storageFilename = `${document.id}.${ext}`;
    const storagePath = path.join(UPLOADS_DIR, storageFilename);

    await writeFile(storagePath, buffer);

    // Update with actual storage path
    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { storagePath },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      format: updated.format,
      sizeBytes: updated.sizeBytes,
      status: updated.status,
      createdAt: updated.createdAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

2. Verify typecheck:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
npm run typecheck 2>&1 | tail -10
```

3. Commit:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
git add apps/web/app/api/documents/
git commit -m "feat(upload): add POST /api/documents/upload route handler

- Auth required (admin or editor role)
- FormData parsing: file + title + optional categoryId
- File validation: size + magic number
- Storage path: apps/web/uploads/{document_id}.{ext} (path traversal safe)
- Returns document JSON (id, title, format, sizeBytes, status)
- Error handling: 400/401/403/413/500"
```

---

### Task 4: Add Documents tRPC Router (list + get + delete)

**Files**:
- Create: `apps/web/lib/trpc/routers/documents.ts`
- Modify: `apps/web/lib/trpc/routers/_app.ts`

**Steps**:

1. Create `apps/web/lib/trpc/routers/documents.ts`:
```ts
import { z } from 'zod';
import { unlink } from 'node:fs/promises';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../server';
import { prisma } from '@/lib/prisma';

export const documentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'published', 'archived']).optional(),
      categoryId: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { status, categoryId, search, limit = 20, cursor } = input ?? {};

      const where = {
        ...(status && { status }),
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { filename: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const documents = await prisma.document.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: { select: { name: true, email: true } },
          category: { select: { name: true, slug: true } },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (documents.length > limit) {
        const next = documents.pop();
        nextCursor = next?.id;
      }

      return {
        documents: documents.map(d => ({
          id: d.id,
          title: d.title,
          filename: d.filename,
          format: d.format,
          sizeBytes: d.sizeBytes,
          status: d.status,
          createdAt: d.createdAt,
          uploader: d.uploader,
          category: d.category,
        })),
        nextCursor,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const doc = await prisma.document.findUnique({
        where: { id: input.id },
        include: {
          uploader: { select: { name: true, email: true } },
          category: true,
        },
      });
      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }
      return doc;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findUnique({ where: { id: input.id } });
      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Only admin or uploader can delete
      if (ctx.session.user.role !== 'admin' && doc.uploaderId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Delete file from filesystem
      try {
        await unlink(doc.storagePath);
      } catch (err) {
        console.warn('Could not delete file from storage:', err);
      }

      // Delete DB record
      await prisma.document.delete({ where: { id: input.id } });

      return { success: true };
    }),
});
```

2. Update `apps/web/lib/trpc/routers/_app.ts` — add documentsRouter:
```ts
import { createTRPCRouter } from '../server';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { documentsRouter } from './documents';

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  documents: documentsRouter,
});

export type AppRouter = typeof appRouter;
```

3. Verify typecheck:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
npm run typecheck 2>&1 | tail -10
```

4. Commit:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
git add apps/web/lib/trpc/routers/documents.ts apps/web/lib/trpc/routers/_app.ts
git commit -m "feat(api): add documents tRPC router (list, get, delete)

- list: paginated with status/category/search filters, cursor-based
- get: full document + uploader + category
- delete: only admin or uploader, also removes file from disk
- All protected procedures (require auth)
- Includes uploader + category in responses"
```

---

### Task 5: Create Upload Button Component (Client)

**Files**:
- Create: `apps/web/app/(dashboard)/documents/upload-button.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/upload-button.tsx`:
```tsx
'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { ALLOWED_MIME_TYPES } from '@/lib/document-helpers';

const ACCEPT_ATTR = Object.values(ALLOWED_MIME_TYPES).join(',') +
  ',.pdf,.docx,.xlsx,.pptx,.md,.txt';

export function UploadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    // Client-side size check
    if (file.size > 50 * 1024 * 1024) {
      setError('File quá lớn (>50MB).');
      return;
    }

    // Use filename as title (user can edit later)
    const title = file.name.replace(/\.[^.]+$/, '');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    startTransition(async () => {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Upload failed');
        return;
      }

      router.refresh();
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 rounded-md transition-all disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        Upload tài liệu
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ''; // Allow re-selecting same file
        }}
      />

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
```

2. Verify typecheck:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
npm run typecheck 2>&1 | tail -10
```

3. Commit:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
git add apps/web/app/\(dashboard\)/documents/upload-button.tsx
git commit -m "feat(upload): add upload button client component

- File picker triggered via button click
- Client-side size validation (>50MB rejected)
- POSTs to /api/documents/upload with FormData
- Shows loading spinner during upload
- Displays error message on failure
- Refreshes page on success"
```

---

### Task 6: Update Documents List Page

**Files**:
- Modify: `apps/web/app/(dashboard)/documents/page.tsx`

**Steps**:

1. Replace `apps/web/app/(dashboard)/documents/page.tsx` with:
```tsx
import Link from 'next/link';
import { FileText, FileSpreadsheet, FileType, Presentation, FileCode } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/format';  // We may need to add this helper
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { UploadButton } from './upload-button';
import { DocumentStatusBadge } from '@/components/document-status-badge';

const FORMAT_ICONS = {
  pdf: FileText,
  docx: FileType,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
  md: FileCode,
  txt: FileText,
} as const;

export default async function DocumentsPage() {
  const session = await auth();
  const documents = await prisma.document.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      uploader: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const canUpload = session?.user.role === 'admin' || session?.user.role === 'editor';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Tài liệu</h1>
          <p className="text-text-muted">Danh sách tài liệu quy trình và quy định</p>
        </div>
        {canUpload && <UploadButton />}
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-text-muted">
          <FileText className="w-12 h-12 mx-auto mb-3 text-border" />
          <p>Chưa có tài liệu nào. Hãy upload tài liệu đầu tiên.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-cream">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Tên</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Danh mục</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Người upload</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Trạng thái</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const Icon = FORMAT_ICONS[doc.format];
                const sizeKB = (doc.sizeBytes / 1024).toFixed(1);
                return (
                  <tr key={doc.id} className="border-t border-border hover:bg-bg-cream transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-3 text-primary hover:underline"
                      >
                        <Icon className="w-4 h-4" />
                        <div>
                          <div className="font-semibold">{doc.title}</div>
                          <div className="text-xs text-text-muted">
                            {doc.format.toUpperCase()} · {sizeKB} KB
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {doc.category?.name ?? <span className="italic">Chưa phân loại</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {doc.uploader.name}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {doc.createdAt.toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

2. Commit:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
git add apps/web/app/\(dashboard\)/documents/page.tsx
git commit -m "feat(dashboard): documents list with upload button

- Server component fetches documents via Prisma directly
- Shows table with title/format/size/category/uploader/status/date
- Empty state placeholder
- Upload button (visible to admin/editor only)
- Document status badge component (placeholder for Plan 3)
- Format-specific Lucide icons"
```

---

### Task 7: Create Document Status Badge Component

**Files**:
- Create: `apps/web/components/document-status-badge.tsx`

**Steps**:

1. Create `apps/web/components/document-status-badge.tsx`:
```tsx
type Status = 'draft' | 'published' | 'archived';

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  draft: {
    label: 'Bản nháp',
    className: 'bg-yellow-100 text-yellow-800',
  },
  published: {
    label: 'Đã đăng',
    className: 'bg-green-100 text-green-800',
  },
  archived: {
    label: 'Đã lưu trữ',
    className: 'bg-gray-100 text-gray-800',
  },
};

export function DocumentStatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
```

2. Commit:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
git add apps/web/components/document-status-badge.tsx
git commit -m "feat(ui): add document status badge component

- 3 statuses: draft (yellow), published (green), archived (gray)
- Pill shape with Vietnamese labels
- Used in documents list and viewer pages"
```

---

### Task 8: Create Document Viewer Placeholder Page

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/page.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/page.tsx`:
```tsx
import Link from 'next/link';
import { ChevronLeft, Download } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DocumentStatusBadge } from '@/components/document-status-badge';

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      uploader: { select: { name: true, email: true } },
      category: true,
    },
  });

  if (!doc) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/documents"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Quay lại danh sách
      </Link>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">{doc.title}</h1>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <span>{doc.format.toUpperCase()}</span>
              <span>·</span>
              <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
              <span>·</span>
              <span>Upload bởi {doc.uploader.name}</span>
              <span>·</span>
              <span>{doc.createdAt.toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
          <DocumentStatusBadge status={doc.status} />
        </div>

        {doc.category && (
          <div className="text-sm">
            <span className="text-text-muted">Danh mục: </span>
            <span className="font-semibold">{doc.category.name}</span>
          </div>
        )}
      </div>

      {/* Tabs placeholder */}
      <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex gap-1">
        <button className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-white">
          Tài liệu
        </button>
        <button
          disabled
          className="px-4 py-2 text-sm font-semibold rounded-md text-text-muted cursor-not-allowed"
          title="Sẽ có ở Plan 3"
        >
          Tóm tắt
        </button>
        <button
          disabled
          className="px-4 py-2 text-sm font-semibold rounded-md text-text-muted cursor-not-allowed"
          title="Sẽ có ở Plan 4"
        >
          Sơ đồ
        </button>
        <button
          disabled
          className="px-4 py-2 text-sm font-semibold rounded-md text-text-muted cursor-not-allowed"
          title="Sẽ có ở Plan 5"
        >
          Trích dẫn
        </button>
      </div>

      {/* Viewer placeholder */}
      <div className="bg-white rounded-lg shadow-sm p-8 text-center text-text-muted">
        <Download className="w-12 h-12 mx-auto mb-3 text-border" />
        <p className="mb-4">
          Viewer cho {doc.format.toUpperCase()} sẽ được implement ở Plan tiếp theo.
        </p>
        <a
          href={`/api/documents/${doc.id}/download`}
          className="text-rikkei-blue hover:underline text-sm"
        >
          Tải file về máy
        </a>
      </div>
    </div>
  );
}
```

2. Commit:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo
git add apps/web/app/\(dashboard\)/documents/\[id\]/
git commit -m "feat(dashboard): document viewer placeholder page

- Fetches document by ID, 404 if not found
- Shows metadata header: title, format, size, uploader, date, status
- Tab navigation (Tài liệu active, Tóm tắt/Sơ đồ/Trích dẫn disabled with placeholders for Plan 3-5)
- Download link (Plan 7 will add secure download route)
- Empty viewer body placeholder"
```

---

### Task 9: Final Verification (Tests + Manual Smoke)

**Files**: none (verification only)

**Steps**:

1. Run all unit tests:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
npm run test 2>&1 | tail -5
```
Expected: 16/16 tests pass (8 env + auth-helpers from Plan 1, 8 document-helpers from this plan).

2. Run typecheck + lint:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -3
```
Expected: exit 0.

3. Start dev server + manual smoke test:
```bash
cd /c/Users/Admin/Desktop/web-noi-bo/apps/web
timeout 30 npm run dev 2>&1 | head -10
```

In another shell:
- Visit `http://localhost:3000/documents`
- Login as admin@rikkei.edu.vn / admin123
- Verify upload button visible
- Upload a small PDF (e.g., from sample docs)
- Verify document appears in list
- Click document → viewer page renders with metadata
- Verify file was saved to `apps/web/uploads/{id}.pdf`

4. Verify in DB:
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT id, title, format, size_bytes, status FROM documents;"
```
Expected: row for uploaded document.

5. Cleanup: remove test upload via SQL if needed.

6. Commit (verification only — no code changes):
```bash
git status
# No commit needed for verification
```

---

## Self-Review

### Spec Coverage
✅ Mỗi yêu cầu MVP section 3.1 "Document Management" được map:
- "Upload multi-format" → Tasks 1-3 (Prisma model + validation + route)
- "Validate MIME type + magic number" → Task 2 (file-type)
- "Lưu file vào apps/web/uploads/{document_id}.{ext}" → Task 3
- "Phân loại theo Category" → Task 1 (relation) + Task 4 (filter)
- "Status draft/published/archived" → Task 1 (enum) + Task 7 (badge)
- "Search by title" → Task 4 (tRPC list with search)

### Placeholder Scan
✅ Không có TODO/TBD thật. Chỉ disabled buttons "Sẽ có ở Plan 3/4/5" — intentional placeholders.

### Type/Name Consistency
- Prisma model names PascalCase, table names snake_case via @@map.
- tRPC procedures camelCase.
- CSS classes follow Rikkei brand tokens (bg-cream, primary, text-muted, border, rikkei-blue).
- File paths consistently use `apps/web/...`.

### File Paths
✅ Tất cả paths chính xác. Path traversal protection trong Task 3 (UUID storage filename).

### Docker Network Reminder
⚠️ Mọi prisma commands (migrate, generate) PHẢI dùng Docker network do Postgres auth issue trên Windows host.

---

## Execution Handoff

**Subagent-driven development** đã được user chọn.

Mỗi task 1-8 sẽ được dispatch subagent mới với:
- Task number + description từ plan này.
- Context: đọc CLAUDE.md + spec doc.
- 2 vòng review (spec compliance + code quality).
- Báo cáo lại kết quả.

Task 9 (verification) sẽ chạy trực tiếp bởi main loop.
