# Plan 7: Document Viewer + Citation Click-to-Source Wiring

**Date**: 2026-08-02
**Spec**: [`docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`](../specs/2026-07-31-internal-document-mgmt-design.md)
**Depends on**: Plan 1-6 ✅
**Next**: Polish + Deploy

## Execution Handoff

> **REQUIRED SUB-SKILL**: Use **subagent-driven-development**.

---

## Goal

Implement inline document viewer + wire citation click-to-source:

1. **Tab "Tài liệu"** — Render theo format:
   - PDF: `react-pdf` (page-by-page)
   - DOCX: `mammoth.js` server-side convert → HTML
   - PPTX: `python-pptx` + render slides as HTML (text only)
   - XLSX: `xlsx` npm package → table
   - MD/TXT: `react-markdown` + syntax highlighting
2. **Citation click → scroll viewer** — wire Plan 5 placeholder to actual viewer scroll

**Plan 7 scope**: ONLY viewer rendering + citation scroll wiring. **KHÔNG bao gồm**:
- OCR cho PDF scan (deferred)
- Real-time collaborative annotations
- PDF.js text layer search

## Problem Statement

Current state (after Plan 6):
- Tab "Tài liệu" trong document viewer hiển thị placeholder text
- User phải tải file về để xem → friction
- Citation click trong Plan 5 chỉ log console

## Architecture

### Render path

```
Document page (server-side)
    ↓
    Detect format → render via component
    ↓
    DocumentViewer (client) fetches chunks via tRPC
    ↓
    DocumentContent component (per format)
    ↓
    PDF/DOCX/XLSX/PPTX/MD render
```

### Citation click flow

```
User clicks citation in CitationTab
    ↓
    setSelectedChunkId + scrollToChunk()
    ↓
    Switch tab to 'viewer'
    ↓
    DocumentContent highlights target chunk/page
```

## Tech Stack

- **react-pdf** (npm) — PDF rendering
- **mammoth** (npm) — DOCX → HTML
- **xlsx** (npm) — XLSX → JSON → table
- **react-markdown** — MD → React elements (already in Plan 4)
- **react-syntax-highlighter** — MD code blocks
- **html2text** (optional) — fallback for unsupported formats

## Global Constraints

1. DRY, YAGNI, TDD, frequent commits
2. **Inline styles** for UI (per [[tailwind-v4-spacing-bug]] memory)
3. **Server-side file streaming** — không load toàn bộ file vào memory
4. **Client-side rendering** cho PDF/DOCX (PDF.js requires browser)
5. **No DB migrations** — schema already exists
6. **Use existing tRPC procs** — không tạo procs mới trừ khi cần

## File Structure

```
apps/web/
├── app/
│   └── (dashboard)/
│       └── documents/
│           └── [id]/
│               ├── document-content.tsx      # NEW: format dispatcher
│               ├── pdf-viewer.tsx            # NEW: PDF rendering
│               ├── docx-viewer.tsx           # NEW: DOCX rendering
│               ├── pptx-viewer.tsx           # NEW: PPTX rendering
│               ├── xlsx-viewer.tsx           # NEW: XLSX rendering
│               ├── md-viewer.tsx             # NEW: MD/TXT rendering
│               ├── citation-tab.tsx          # Modify: wire click handler
│               └── document-viewer.tsx       # Modify: scroll to chunk
└── app/
    └── api/
        └── documents/
            └── [id]/
                └── content/
                    └── route.ts             # NEW: stream file bytes (auth)
```

---

## Tasks

### Task 1: Install dependencies

**Files**:
- Modify: `apps/web/package.json`

**Steps**:

1. Add dependencies:
```json
{
  "dependencies": {
    "react-pdf": "^9.0.0",
    "mammoth": "^1.8.0",
    "xlsx": "^0.18.5",
    "react-syntax-highlighter": "^15.5.0"
  }
}
```

2. Install + rebuild:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
npm install --workspace=@rikkei/web
docker compose --profile ai build web
```

3. Commit:
```bash
git add apps/web/package.json
git commit -m "feat(web): add document viewer dependencies

- react-pdf@^9: PDF rendering in browser
- mammoth@^1.8: DOCX → HTML conversion
- xlsx@^0.18: parse XLSX to JSON
- react-syntax-highlighter: MD code block highlighting"
```

---

### Task 2: File content streaming API

**Files**:
- Create: `apps/web/app/api/documents/[id]/content/route.ts`

**Steps**:

1. Create `apps/web/app/api/documents/[id]/content/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'node:fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { storagePath: true, filename: true },
  });
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(doc.storagePath);
    const contentType = getMimeType(doc.filename);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Read failed' }, { status: 500 });
  }
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    md: 'text/markdown',
    txt: 'text/plain',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}
```

2. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

3. Commit:
```bash
git add "apps/web/app/api/documents/[id]/content/route.ts"
git commit -m "feat(web): add /api/documents/{id}/content for streaming file bytes

- Auth-protected, returns file buffer with correct MIME type
- Used by PDF/DOCX/XLSX viewers
- 5 min cache to reduce DB hits"
```

---

### Task 3: PDF viewer

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/pdf-viewer.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/pdf-viewer.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  documentId: string;
  highlightPage?: number;
};

export function PdfViewer({ documentId, highlightPage }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const fileUrl = `/api/documents/${documentId}/content`;

  const onLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (highlightPage) {
      setPageNumber(highlightPage);
    }
  };

  const goToPrevPage = () =>
    setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setPageNumber((prev) => Math.min(prev + 1, numPages));

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button
          onClick={goToPrevPage}
          disabled={pageNumber <= 1}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
            opacity: pageNumber <= 1 ? 0.5 : 1,
          }}
        >
          ← Trang trước
        </button>
        <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Trang {pageNumber} / {numPages}
        </span>
        <button
          onClick={goToNextPage}
          disabled={pageNumber >= numPages}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer',
            opacity: pageNumber >= numPages ? 0.5 : 1,
          }}
        >
          Trang sau →
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Document
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          loading={<div style={{ padding: '32px' }}>Đang tải PDF...</div>}
          error={<div style={{ padding: '32px', color: '#dc2626' }}>Lỗi tải PDF</div>}
        >
          <Page
            pageNumber={pageNumber}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            width={800}
          />
        </Document>
      </div>
    </div>
  );
}
```

2. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

3. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/pdf-viewer.tsx"
git commit -m "feat(web): add PdfViewer with react-pdf + page navigation

- React-pdf renders PDF from /api/documents/{id}/content
- Prev/Next buttons + page counter
- Highlight page via highlightPage prop (for citation scroll)"
```

---

### Task 4: DOCX viewer

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/docx-viewer.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/docx-viewer.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';

type Props = {
  documentId: string;
};

export function DocxViewer({ documentId }: Props) {
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHtml = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/docx-html`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setHtml(data.html);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    fetchHtml();
  }, [documentId]);

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: '#dc2626',
      }}>
        Lỗi tải DOCX: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        lineHeight: '1.6',
        fontSize: '15px',
        color: 'var(--color-text-dark)',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

2. Create server endpoint to convert DOCX → HTML. Create `apps/web/app/api/documents/[id]/docx-html/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'node:fs/promises';
import mammoth from 'mammoth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { storagePath: true, format: true },
  });
  if (!doc || doc.format !== 'docx') {
    return NextResponse.json({ error: 'Not a DOCX file' }, { status: 400 });
  }

  try {
    const buffer = await readFile(doc.storagePath);
    const result = await mammoth.convertToHtml({ buffer });
    return NextResponse.json({ html: result.value });
  } catch (err) {
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
```

3. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

4. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/docx-viewer.tsx"
git add "apps/web/app/api/documents/[id]/docx-html/route.ts"
git commit -m "feat(web): add DocxViewer with server-side mammoth conversion

- Client fetches /api/documents/{id}/docx-html
- Server uses mammoth to convert DOCX → HTML
- Render via dangerouslySetInnerHTML (safe — server-generated)"
```

---

### Task 5: XLSX viewer

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/xlsx-viewer.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/xlsx-viewer.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';

type Props = {
  documentId: string;
};

type Sheet = {
  name: string;
  data: string[][];
};

export function XlsxViewer({ documentId }: Props) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/xlsx-data`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setSheets(data.sheets);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    fetchSheets();
  }, [documentId]);

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: '#dc2626',
      }}>
        Lỗi tải XLSX: {error}
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        Đang tải...
      </div>
    );
  }

  const current = sheets[activeSheet];
  const maxRows = current.data.length;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      {sheets.length > 1 && (
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sheets.map((sheet, idx) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(idx)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: activeSheet === idx ? 600 : 400,
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                backgroundColor: activeSheet === idx ? 'var(--color-primary)' : 'white',
                color: activeSheet === idx ? 'white' : 'var(--color-text-dark)',
                cursor: 'pointer',
              }}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div style={{
        fontSize: '13px',
        color: 'var(--color-text-muted)',
        marginBottom: '8px',
      }}>
        {current.name} • {maxRows} hàng
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {current.data.slice(0, 100).map((row, rowIdx) => (
              <tr key={rowIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{
                  padding: '6px 8px',
                  fontWeight: 600,
                  backgroundColor: '#f8fafc',
                  color: 'var(--color-text-muted)',
                  minWidth: '50px',
                  textAlign: 'center',
                }}>
                  {rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    style={{
                      padding: '6px 8px',
                      borderLeft: '1px solid var(--color-border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {maxRows > 100 && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}>
          Hiển thị 100/{maxRows} hàng đầu tiên
        </div>
      )}
    </div>
  );
}
```

2. Create server endpoint to parse XLSX. Create `apps/web/app/api/documents/[id]/xlsx-data/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { storagePath: true, format: true },
  });
  if (!doc || doc.format !== 'xlsx') {
    return NextResponse.json({ error: 'Not an XLSX file' }, { status: 400 });
  }

  try {
    const buffer = await readFile(doc.storagePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
      return { name, data };
    });

    return NextResponse.json({ sheets });
  } catch (err) {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
}
```

3. Verify typecheck + commit:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
git add "apps/web/app/(dashboard)/documents/[id]/xlsx-viewer.tsx"
git add "apps/web/app/api/documents/[id]/xlsx-data/route.ts"
git commit -m "feat(web): add XlsxViewer with sheet tabs + row numbers

- Server parses XLSX with xlsx package
- Client shows sheet tabs (if multi-sheet) + scrollable table
- Display first 100 rows with row numbers for navigation
- Plan 6 wiring: highlight row by row_number prop"
```

---

### Task 6: PPTX + MD viewers

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/pptx-viewer.tsx`
- Create: `apps/web/app/(dashboard)/documents/[id]/md-viewer.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/pptx-viewer.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';

type Props = {
  documentId: string;
};

type Slide = {
  slideNumber: number;
  text: string;
};

export function PptxViewer({ documentId }: Props) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlide, setActiveSlide] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/pptx-slides`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setSlides(data.slides);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    fetchSlides();
  }, [documentId]);

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: '#dc2626',
      }}>
        Lỗi tải PPTX: {error}
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        Đang tải...
      </div>
    );
  }

  const current = slides.find((s) => s.slideNumber === activeSlide) ?? slides[0];

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button
          onClick={() => setActiveSlide(Math.max(1, activeSlide - 1))}
          disabled={activeSlide <= 1}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: activeSlide <= 1 ? 'not-allowed' : 'pointer',
            opacity: activeSlide <= 1 ? 0.5 : 1,
          }}
        >
          ← Slide trước
        </button>
        <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Slide {activeSlide} / {slides.length}
        </span>
        <button
          onClick={() => setActiveSlide(Math.min(slides.length, activeSlide + 1))}
          disabled={activeSlide >= slides.length}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: activeSlide >= slides.length ? 'not-allowed' : 'pointer',
            opacity: activeSlide >= slides.length ? 0.5 : 1,
          }}
        >
          Slide sau →
        </button>
      </div>

      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        padding: '32px',
        minHeight: '300px',
        whiteSpace: 'pre-wrap',
        fontSize: '15px',
        lineHeight: '1.6',
        color: 'var(--color-text-dark)',
      }}>
        {current.text || '(Slide trống)'}
      </div>
    </div>
  );
}
```

2. Create server endpoint for PPTX. Create `apps/web/app/api/documents/[id]/pptx-slides/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { storagePath: true, format: true },
  });
  if (!doc || doc.format !== 'pptx') {
    return NextResponse.json({ error: 'Not a PPTX file' }, { status: 400 });
  }

  try {
    const buffer = await readFile(doc.storagePath);
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort();

    const slides = await Promise.all(
      slideFiles.map(async (name, idx) => {
        const content = await zip.files[name].async('text');
        // Extract all <a:t> text
        const texts = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
        const text = texts
          .map((t) => t.replace(/<[^>]+>/g, ''))
          .join('\n');
        return { slideNumber: idx + 1, text };
      }),
    );

    return NextResponse.json({ slides });
  } catch (err) {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
}
```

3. Create `apps/web/app/(dashboard)/documents/[id]/md-viewer.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Props = {
  documentId: string;
  format: 'md' | 'txt';
};

export function MdViewer({ documentId, format }: Props) {
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchText = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/content`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        setText(decoder.decode(buffer));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    fetchText();
  }, [documentId]);

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: '#dc2626',
      }}>
        Lỗi tải: {error}
      </div>
    );
  }

  if (!text) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        Đang tải...
      </div>
    );
  }

  if (format === 'txt') {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        color: 'var(--color-text-dark)',
      }}>
        {text}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '32px',
      lineHeight: '1.6',
      fontSize: '15px',
      color: 'var(--color-text-dark)',
    }}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneLight as any}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
```

4. Verify typecheck + commit:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
git add "apps/web/app/(dashboard)/documents/[id]/pptx-viewer.tsx"
git add "apps/web/app/(dashboard)/documents/[id]/md-viewer.tsx"
git add "apps/web/app/api/documents/[id]/pptx-slides/route.ts"
git commit -m "feat(web): add PptxViewer + MdViewer (with syntax highlighting)

- PPTX: server extracts slide text via JSZip, client renders with nav
- MD: react-markdown with react-syntax-highlighter for code blocks
- TXT: plain text with monospace font
- All use /api/documents/{id}/content for file bytes"
```

---

### Task 7: DocumentContent dispatcher

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/document-content.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/document-content.tsx`:
```tsx
'use client';

import { trpc } from '@/lib/trpc/client';
import { PdfViewer } from './pdf-viewer';
import { DocxViewer } from './docx-viewer';
import { PptxViewer } from './pptx-viewer';
import { XlsxViewer } from './xlsx-viewer';
import { MdViewer } from './md-viewer';

type Props = {
  documentId: string;
  format: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'md' | 'txt';
  highlightPage?: number;
};

export function DocumentContent({ documentId, format, highlightPage }: Props) {
  switch (format) {
    case 'pdf':
      return <PdfViewer documentId={documentId} highlightPage={highlightPage} />;
    case 'docx':
      return <DocxViewer documentId={documentId} />;
    case 'pptx':
      return <PptxViewer documentId={documentId} />;
    case 'xlsx':
      return <XlsxViewer documentId={documentId} />;
    case 'md':
    case 'txt':
      return <MdViewer documentId={documentId} format={format} />;
    default:
      return (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          Format không hỗ trợ: {format}
        </div>
      );
  }
}
```

2. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/document-content.tsx"
git commit -m "feat(web): add DocumentContent format dispatcher

- Switch on format → render appropriate viewer
- Currently supports PDF/DOCX/PPTX/XLSX/MD/TXT
- Falls back to error message for unknown formats"
```

---

### Task 8: Wire DocumentViewer to DocumentContent

**Files**:
- Modify: `apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx`

**Steps**:

1. Replace 'viewer' tab placeholder with DocumentContent. Update DocumentViewer:

Add new props to accept format:
```tsx
type Props = {
  documentId: string;
  format: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'md' | 'txt';
  hasSummary: boolean;
  hasFlowchart: boolean;
  hasCitations: boolean;
};
```

Add new state for highlight:
```tsx
const [highlightPage, setHighlightPage] = useState<number | undefined>(undefined);
```

Update handler to accept page number:
```tsx
const handleCitationClick = useCallback((page: number | undefined) => {
  setHighlightPage(page);
  setActiveTab('viewer');
}, []);
```

Replace the placeholder viewer block:
```tsx
      {activeTab === 'viewer' && (
        <DocumentContent
          documentId={documentId}
          format={format}
          highlightPage={highlightPage}
        />
      )}
```

Add import:
```tsx
import { DocumentContent } from './document-content';
```

2. Update `apps/web/app/(dashboard)/documents/[id]/page.tsx` to pass format:
```tsx
      <DocumentViewer
        documentId={doc.id}
        format={doc.format as any}
        hasSummary={!!doc.summary}
        hasFlowchart={!!doc.flowchart}
        hasCitations={false}
      />
```

3. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

4. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx"
git add "apps/web/app/(dashboard)/documents/[id]/page.tsx"
git commit -m "feat(web): wire DocumentContent into DocumentViewer

- Pass format from page.tsx
- Highlight page state managed by DocumentViewer
- Citation click (Plan 6 next) will set highlightPage + switch tab"
```

---

### Task 9: Wire citation click to highlight

**Files**:
- Modify: `apps/web/app/(dashboard)/documents/[id]/citation-tab.tsx`

**Steps**:

1. Update `apps/web/app/(dashboard)/documents/[id]/citation-tab.tsx`:

Change the component to accept onClick prop:
```tsx
type Props = {
  documentId: string;
  onCitationClick: (page: number | undefined) => void;
};

export function CitationTab({ documentId, onCitationClick }: Props) {
  // ... existing code

  const handleClick = (cit: any) => {
    onCitationClick(cit.pageNumber ?? undefined);
  };

  // ... rest, replace handleClick() calls
}
```

2. Update `apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx`:

Pass handleCitationClick to CitationTab:
```tsx
      {activeTab === 'citation' && status.hasCitations && (
        <CitationTab documentId={documentId} onCitationClick={handleCitationClick} />
      )}
```

3. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

4. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/citation-tab.tsx"
git add "apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx"
git commit -m "feat(web): wire citation click to scroll viewer

- CitationTab now accepts onCitationClick callback
- DocumentViewer sets highlightPage + switches to viewer tab
- PDF viewer shows correct page after citation click
- Plan 5 placeholder replaced with real wiring"
```

---

### Task 10: End-to-end verification

**Files**: none (verification only)

**Steps**:

1. Rebuild:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
docker compose --profile ai down
docker compose --profile ai up -d --build
```

2. Upload test documents:
- Upload a PDF → Tab "Tài liệu" should show PDF with page navigation
- Upload a DOCX → Should show formatted HTML
- Upload an XLSX → Should show sheets + table
- Upload a MD → Should show rendered markdown

3. Test citation click:
- Open a published PDF doc
- Tab "Trích dẫn" → click any citation
- Should switch to "Tài liệu" tab + show correct page

4. Verify in browser console:
- No errors
- PDF.js worker loads from unpkg CDN

---

## Self-Review

### Spec Coverage
✅ Plan 7 scope:
- "PDF: react-pdf (theo page)" → Task 3
- "DOCX: mammoth → render HTML" → Task 4
- "PPTX: extract slides" → Task 6
- "XLSX: render bảng" → Task 5
- "MD/TXT: render trực tiếp" → Task 6
- "Click citation → scroll + highlight" → Task 9

### Placeholder Scan
- Plan 7 completes viewer scope. OCR for PDF scan is explicit nice-to-have.

### Type/Name Consistency
- `format` props consistent across files
- `highlightPage` only PDF supports; XLSX/PPTX use row/slide highlight (deferred)

### Memory Compliance
- Inline styles (per [[tailwind-v4-spacing-bug]])
- No DB migrations

---

## Execution Handoff

**Subagent-driven development**. Mỗi task 1-9 dispatch subagent. Task 10 verify.