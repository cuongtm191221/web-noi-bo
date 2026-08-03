# Plan 5: Citation & Click-to-Source

**Date**: 2026-08-02
**Spec**: [`docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`](../specs/2026-07-31-internal-document-mgmt-design.md)
**Depends on**: Plan 1-4 ✅
**Next**: Plan 6 (MCP Server)

## Execution Handoff

> **REQUIRED SUB-SKILL**: Use **subagent-driven-development**.

---

## Goal

Implement citation rendering + click-to-source highlighting:
1. **Tab "Trích dẫn"**: List citations với claim text + location (page/slide/sheet/cell)
2. **Inline citations**: Add `[1]`, `[2]` markers vào summary tab
3. **Click citation → highlight** relevant chunk trong viewer (placeholder cho Plan 6 PDF viewer)

**Plan 5 scope**: Citation list UI + inline markers + click handler. **KHÔNG bao gồm**:
- Real PDF viewer with scroll/highlight (Plan 6)
- Cell-level highlighting in XLSX (deferred - chunks không có character-level offset)
- Citation validation (LLM hallucination check)

## Problem Statement

Current state (after Plan 4):
- AI pipeline generates citations (stored in `Citation` table with `chunk_id`, `claim_text`, polymorphic location)
- No UI to view them
- User can't trace a claim back to source

## Architecture

### Data flow
```
AI Pipeline (Plan 3) → Citation table (chunk_id, claim_text, location)
                                          ↓
                              CitationTab (this plan) fetches via tRPC
                                          ↓
                              User clicks [N] in SummaryTab or item in CitationTab
                                          ↓
                              Future PDF viewer (Plan 6) scrolls + highlights
```

### Inline citation markers

Summary's `executiveSummary` text gets augmented with `[1]`, `[2]` markers based on citation `chunk_index` mapping.

## Global Constraints

1. DRY, YAGNI, TDD, frequent commits
2. **Inline styles** for UI (per [[tailwind-v4-spacing-bug]] memory)
3. **No DB migrations** — schema already exists (Plan 2)
4. **No new env vars**
5. **No new dependencies** — uses existing tRPC + React
6. **Click handlers** are placeholders (Plan 6 will wire to actual viewer)

## File Structure

```
apps/web/
├── app/
│   └── (dashboard)/
│       └── documents/
│           └── [id]/
│               ├── citation-tab.tsx       # NEW: render citation list
│               ├── summary-tab.tsx        # Modify: add [N] inline markers
│               └── document-viewer.tsx    # Modify: enable Citation tab
└── lib/
    └── trpc/
        └── routers/
            └── documents.ts               # Modify: add getCitations proc
```

---

## Tasks

### Task 1: tRPC proc — getCitations

**Files**:
- Modify: `apps/web/lib/trpc/routers/documents.ts`

**Steps**:

1. Add `getCitations` proc:
```ts
getCitations: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    const citations = await prisma.citation.findMany({
      where: { documentId: input.id },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        claimText: true,
        pageNumber: true,
        slideNumber: true,
        sheetName: true,
        rowNumber: true,
        columnLetter: true,
        order: true,
        chunkId: true,
        chunk: {
          select: {
            chunkIndex: true,
            text: true,
            pageNumber: true,
            slideNumber: true,
            sheetName: true,
            rowNumber: true,
          },
        },
      },
    });
    return citations;
  }),
```

2. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

3. Commit:
```bash
git add apps/web/lib/trpc/routers/documents.ts
git commit -m "feat(web): add getCitations tRPC proc

- Fetches citations with chunk join for source text
- Order by order ASC for consistent display
- Returns polymorphic location (page/slide/sheet/row/column)"
```

---

### Task 2: CitationTab component

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/citation-tab.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/citation-tab.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
};

function formatLocation(cit: {
  pageNumber: number | null;
  slideNumber: number | null;
  sheetName: string | null;
  rowNumber: number | null;
  columnLetter: string | null;
}): string {
  if (cit.pageNumber) return `[trang ${cit.pageNumber}]`;
  if (cit.slideNumber) return `[slide ${cit.slideNumber}]`;
  if (cit.sheetName) {
    let loc = `[sheet "${cit.sheetName}"`;
    if (cit.rowNumber) loc += `, hàng ${cit.rowNumber}`;
    if (cit.columnLetter) loc += `, cột ${cit.columnLetter}`;
    loc += ']';
    return loc;
  }
  return '[không xác định]';
}

export function CitationTab({ documentId }: Props) {
  const { data, isLoading, error } = trpc.documents.getCitations.useQuery({
    id: documentId,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setSelectedId(id);
    // TODO Plan 6: scroll PDF viewer + highlight chunk
    console.log('Citation clicked:', id);
  };

  if (isLoading) {
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
        Lỗi tải trích dẫn
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        AI chưa tạo trích dẫn
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>
        Trích dẫn ({data.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((cit) => {
          const isSelected = selectedId === cit.id;
          const location = formatLocation(cit);
          return (
            <div
              key={cit.id}
              onClick={() => handleClick(cit.id)}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: isSelected
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                backgroundColor: isSelected ? '#eff6ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {cit.order + 1}
                </span>
                <div style={{ flex: 1, fontSize: '14px', lineHeight: '1.5' }}>
                  <div style={{ color: 'var(--color-text-dark)', marginBottom: '6px' }}>
                    {cit.claimText}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    fontWeight: 500,
                  }}>
                    {location}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
git add "apps/web/app/(dashboard)/documents/[id]/citation-tab.tsx"
git commit -m "feat(web): add CitationTab with citation list + click handler

- Renders citations as clickable cards with [N] numbered badges
- Shows claim text + location (page/slide/sheet/cell)
- Click handler logs (Plan 6 will wire to PDF viewer scroll)
- Selected state highlights card with border + background
- Loading/error/empty states handled"
```

---

### Task 3: Update DocumentViewer to enable Citation tab

**Files**:
- Modify: `apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx`

**Steps**:

1. Add citation tab. Replace the tabs block:
```tsx
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '4px',
        marginBottom: '24px',
        display: 'inline-flex',
        gap: '4px',
      }}>
        <button
          onClick={() => setActiveTab('viewer')}
          style={tabStyle(activeTab === 'viewer', false)}
        >
          Tài liệu
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          disabled={!status.hasSummary}
          style={tabStyle(activeTab === 'summary', !status.hasSummary)}
          title={status.hasSummary ? '' : 'Đang xử lý AI...'}
        >
          Tóm tắt
        </button>
        <button
          onClick={() => setActiveTab('flowchart')}
          disabled={!status.hasFlowchart}
          style={tabStyle(activeTab === 'flowchart', !status.hasFlowchart)}
          title={status.hasFlowchart ? '' : 'Đang xử lý AI...'}
        >
          Sơ đồ
        </button>
        <button
          onClick={() => setActiveTab('citation')}
          disabled={!status.hasSummary}
          style={tabStyle(activeTab === 'citation', !status.hasSummary)}
          title={status.hasSummary ? '' : 'Đang xử lý AI...'}
        >
          Trích dẫn
        </button>
      </div>
```

2. Update `Tab` type:
```tsx
type Tab = 'viewer' | 'summary' | 'flowchart' | 'citation';
```

3. Add imports:
```tsx
import { CitationTab } from './citation-tab';
```

4. Add new tab content + citation_count polling:

Update ProcessingStatus Props to also pass citationCount:
```tsx
type Props = {
  documentId: string;
  initialHasSummary: boolean;
  initialHasFlowchart: boolean;
  initialHasCitations: boolean;
  onUpdate: (s: { hasSummary: boolean; hasFlowchart: boolean; hasCitations: boolean }) => void;
};
```

Update `processingStatus` tRPC proc return value to include `citationCount`:
```ts
  processingStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const doc = await prisma.document.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          status: true,
          summary: { select: { id: true, createdAt: true } },
          flowchart: { select: { id: true, createdAt: true } },
          _count: { select: { citations: true, chunks: true } },
        },
      });
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });
      return {
        status: doc.status,
        hasSummary: !!doc.summary,
        hasFlowchart: !!doc.flowchart,
        citationCount: doc._count.citations,
        chunkCount: doc._count.chunks,
      };
    }),
```

5. Add render blocks:
```tsx
      {activeTab === 'citation' && status.hasCitations && (
        <CitationTab documentId={documentId} />
      )}

      {activeTab === 'citation' && !status.hasCitations && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#1e40af',
            animation: 'pulse 1.5s ease-in-out infinite',
            marginRight: '8px',
          }} />
          AI đang tạo trích dẫn, vui lòng đợi...
        </div>
      )}
```

6. Update ProcessingStatus component:
```tsx
'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
  initialHasSummary: boolean;
  initialHasFlowchart: boolean;
  initialHasCitations: boolean;
  onUpdate: (s: { hasSummary: boolean; hasFlowchart: boolean; hasCitations: boolean }) => void;
};

export function ProcessingStatus({
  documentId,
  initialHasSummary,
  initialHasFlowchart,
  initialHasCitations,
  onUpdate,
}: Props) {
  const isProcessing = !initialHasSummary || !initialHasFlowchart;

  const { data } = trpc.documents.processingStatus.useQuery(
    { id: documentId },
    {
      enabled: isProcessing,
      refetchInterval: isProcessing ? 5000 : false,
      refetchIntervalInBackground: false,
    },
  );

  useEffect(() => {
    if (data) {
      onUpdate({
        hasSummary: data.hasSummary,
        hasFlowchart: data.hasFlowchart,
        hasCitations: data.citationCount > 0,
      });
    }
  }, [data, onUpdate]);

  return null;
}
```

7. Update document page props to pass `hasCitations`:
```tsx
      <DocumentViewer
        documentId={doc.id}
        hasSummary={!!doc.summary}
        hasFlowchart={!!doc.flowchart}
        hasCitations={false}
      />
```

(Initial false since server can't easily count — polling will detect)

8. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

9. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx"
git add "apps/web/app/(dashboard)/documents/[id]/processing-status.tsx"
git add "apps/web/app/(dashboard)/documents/[id]/page.tsx"
git add apps/web/lib/trpc/routers/documents.ts
git commit -m "feat(web): enable Citation tab in DocumentViewer

- Add 4th tab 'Trích dẫn' enabled when hasCitations (citationCount > 0)
- Update ProcessingStatus to also poll citationCount
- Update page.tsx to pass hasCitations prop (always false server-side, polling detects)
- Click handlers still placeholder (Plan 6 will wire)"
```

---

### Task 4: SummaryTab — inline citation markers

**Files**:
- Modify: `apps/web/app/(dashboard)/documents/[id]/summary-tab.tsx`

**Steps**:

1. Add `react-markdown` citation rendering. Replace the existing `<ReactMarkdown>` block with:

```tsx
      <div style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '24px', color: 'var(--color-text-dark)' }}>
        <ReactMarkdown
          components={{
            // Custom render for [N] citation markers
            p: ({ children, ...props }) => (
              <p {...props} style={{ marginBottom: '12px' }}>
                {enrichCitations(children)}
              </p>
            ),
          }}
        >
          {data.summary.executiveSummary}
        </ReactMarkdown>
      </div>
```

2. Add helper function + imports:
```tsx
'use client';

import React, { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
};

// Match [1], [2], etc. and render as superscript badge
function enrichCitations(children: ReactNode): ReactNode {
  if (typeof children === 'string') {
    const parts = children.split(/(\[\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const num = match[1];
        return (
          <sup
            key={idx}
            style={{
              display: 'inline-block',
              minWidth: '20px',
              padding: '0 4px',
              margin: '0 2px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 700,
              lineHeight: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              verticalAlign: 'super',
            }}
            title={`Trích dẫn #${num}`}
          >
            {num}
          </sup>
        );
      }
      return part;
    });
  }
  return children;
}

export function SummaryTab({ documentId }: Props) {
  // ... rest unchanged
}
```

3. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

4. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/summary-tab.tsx"
git commit -m "feat(web): render inline citation markers [N] in SummaryTab

- Parse [1], [2], etc. in executiveSummary
- Render as superscript pill with primary color
- Tooltip shows 'Trích dẫn #N'
- Custom markdown paragraph renderer integrates enrichCitations"
```

---

### Task 5: End-to-end verification

**Files**: none (verification only)

**Steps**:

1. Rebuild web service (no new deps):
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
docker compose --profile ai down
docker compose --profile ai up -d --build
```

2. Open http://localhost:3000, open existing published doc (cmsc30acg0001ny2hy74978a8)

3. Test:
- **Verify**: 4 tabs visible: Tài liệu, Tóm tắt, Sơ đồ, Trích dẫn
- **Verify**: Click "Tóm tắt" → see summary text with `[1]`, `[2]` markers as superscript pills
- **Verify**: Click "Trích dẫn" → see list of citation cards with claim + location
- **Verify**: Click citation card → border highlights, console.log appears
- **Verify**: Location shown correctly (e.g. "[trang X]" for PDF)

4. Check DB:
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT document_id, claim_text, page_number, \"order\" FROM citations ORDER BY \"order\" LIMIT 5;"
```

---

## Self-Review

### Spec Coverage
✅ Plan 5 scope:
- "Citation reference [trang X], [slide X], [sheet Tên sheet, hàng Y]" → Task 2 (formatLocation helper)
- "Tab Trích dẫn: danh sách citation" → Task 2 (CitationTab)
- "Click → scroll viewer + highlight" → Task 2 (placeholder, Plan 6 wires real)
- "Citation [1], [2] inline" → Task 4 (enrichCitations)

### Placeholder Scan
- Citation click → console.log (intentional, Plan 6)
- No real PDF viewer scroll/highlight (Plan 6)

### Type/Name Consistency
- `hasCitations` prop same name across files
- `citationCount` in tRPC matches DB schema

### Memory Compliance
- Inline styles (per [[tailwind-v4-spacing-bug]])
- Reuses existing tRPC + React (no new deps)

---

## Execution Handoff

**Subagent-driven development**. Mỗi task 1-4 dispatch subagent. Task 5 verify.