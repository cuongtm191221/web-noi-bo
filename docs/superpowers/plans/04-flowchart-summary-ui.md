# Plan 4: Flowchart & Summary UI + Real-time AI Processing Feedback

**Date**: 2026-08-02
**Spec**: [`docs/superpowers/specs/2026-07-31-internal-document-mgmt-design.md`](../specs/2026-07-31-internal-document-mgmt-design.md)
**Depends on**: Plan 1-3 ✅
**Next**: Plan 5 (Citation + click-to-source)

## Execution Handoff

> **REQUIRED SUB-SKILL**: Use **subagent-driven-development**.

---

## Goal

Implement three related UI features:
1. **Tab "Sơ đồ"**: Render Mermaid flowchart from `DocumentFlowchart.mermaidSyntax`
2. **Tab "Tóm tắt"**: Render markdown summary + checklist from `DocumentSummary`
3. **UX feedback**: Don't make user wait 4+ minutes for AI processing — show real-time status

**Plan 4 scope**: ONLY Mermaid render, Markdown render, processing status UI. **KHÔNG bao gồm**:
- Document content viewers (PDF/DOCX/PPTX/XLSX rendering) — Plan 6
- Citation click-to-source (Plan 5)
- Markdown syntax highlighting (use simple render)

## Problem Statement

Current state (after Plan 3):
- User uploads PDF → upload route fires `/process` to AI pipeline
- `fetch()` in upload route **blocks** until FastAPI background task starts
- User sees no feedback during 4+ minutes of AI processing
- Documents list shows `draft` status with no indication it's "AI is processing"
- Document viewer's tabs "Tóm tắt" / "Sơ đồ" are placeholder buttons only

## Architecture

### State machine for document.status
```
draft (created) → AI processing in background → published (success)
                                       ↘ archived (empty content)
```

### UX flow

1. User uploads PDF → POST /api/documents/upload returns 201 immediately with status=draft
2. Background: AI pipeline fires via fire-and-forget fetch (no await in upload route)
3. Documents list shows "draft" with **animated spinner** + "Đang xử lý AI..." badge
4. Document viewer polls tRPC processingStatus every 5s
5. When status changes to published:
   - Polling stops
   - Spinner hides
   - Tab "Tóm tắt" / "Sơ đồ" buttons become active
   - Polling tRPC shows hasSummary=true → enable render

### Tech additions
- `mermaid` (npm) — render Mermaid syntax in browser
- `react-markdown` (npm) — render Markdown from summary

## Global Constraints

1. DRY, YAGNI, TDD, frequent commits
2. **Inline styles** for UI (per [[tailwind-v4-spacing-bug]] memory)
3. **No new env vars** — reuse existing `AI_PIPELINE_URL`
4. **No migrations** — all DB tables already exist from Plan 3
5. **Polling**: 5s interval, stop after 5 minutes (avoid infinite loops)

## File Structure

```
apps/web/
├── package.json                      # Add mermaid, react-markdown
├── app/
│   └── (dashboard)/
│       └── documents/
│           └── [id]/
│               ├── page.tsx          # Modify: enable Tóm tắt + Sơ đồ tabs
│               ├── document-viewer.tsx   # NEW: client component with tabs
│               ├── summary-tab.tsx       # NEW: render executive_summary + checklist
│               ├── flowchart-tab.tsx     # NEW: render Mermaid
│               └── processing-status.tsx # NEW: polling tRPC for status
└── app/
    └── api/
        └── documents/
            └── upload/
                └── route.ts          # Modify: fire-and-forget (no await)
└── components/
    └── document-list-item.tsx        # NEW: animated status badge
```

---

## Tasks

### Task 1: Install mermaid + react-markdown

**Files**:
- Modify: `apps/web/package.json`

**Steps**:

1. Add to dependencies:
```json
{
  "dependencies": {
    "mermaid": "^11.0.0",
    "react-markdown": "^9.0.0"
  }
}
```

2. Install (in container via web service rebuild):
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
docker compose --profile ai build web
```

3. Verify:
```bash
docker compose --profile ai exec web sh -c "ls /app/node_modules/mermaid/package.json && ls /app/node_modules/react-markdown/package.json"
```

Expected: Both files exist.

4. Commit:
```bash
git add apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): add mermaid + react-markdown dependencies

- mermaid@^11: render flowchart from DocumentFlowchart.mermaidSyntax
- react-markdown@^9: render executive_summary text from DocumentSummary
- Used in Plan 4 tabs Sơ đồ + Tóm tắt"
```

---

### Task 2: Fire-and-forget AI trigger

**Files**:
- Modify: `apps/web/app/api/documents/upload/route.ts`

**Steps**:

1. Find current AI trigger section. Wrap `fetch()` to NOT block response:

Replace:
```ts
    // Trigger AI processing (fire-and-forget)
    const aiPipelineUrl = process.env.AI_PIPELINE_URL ?? 'http://ai-pipeline:8000';
    try {
      await fetch(`${aiPipelineUrl}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: updated.id,
          storage_path: updated.storagePath,
          format: updated.format,
        }),
      });
    } catch (err) {
      console.warn('AI pipeline trigger failed (continuing):', err);
    }
```

With:
```ts
    // Trigger AI processing (fire-and-forget, no await)
    const aiPipelineUrl = process.env.AI_PIPELINE_URL ?? 'http://ai-pipeline:8000';
    void fetch(`${aiPipelineUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: updated.id,
        storage_path: updated.storagePath,
        format: updated.format,
      }),
    }).catch((err) => {
      console.warn('AI pipeline trigger failed (continuing):', err);
    });
```

**Note**: `void` keyword tells TS to ignore the promise. `.catch` handles any error without blocking.

2. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

3. Commit:
```bash
git add apps/web/app/api/documents/upload/route.ts
git commit -m "fix(web): fire-and-forget AI pipeline trigger

- Upload route returns immediately, doesn't await fetch to ai-pipeline
- User no longer waits for AI processing to start (~50ms saved)
- Errors logged via .catch() but don't block upload response"
```

---

### Task 3: Document list — animated status badge

**Files**:
- Modify: `apps/web/app/(dashboard)/documents/page.tsx`

**Steps**:

1. In documents list, show different badges based on status:

Replace the row's `<DocumentStatusBadge status={doc.status} />` cell with:
```tsx
<td style={{ padding: '12px 16px' }}>
  {doc.status === 'draft' ? (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '9999px',
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    }}>
      <span style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#1e40af',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      Đang xử lý AI...
    </span>
  ) : (
    <DocumentStatusBadge status={doc.status} />
  )}
</td>
```

2. Add `@keyframes pulse` to globals.css:
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

Append to `apps/web/app/globals.css`.

3. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

4. Commit:
```bash
git add apps/web/app/\(dashboard\)/documents/page.tsx apps/web/app/globals.css
git commit -m "feat(web): show 'Đang xử lý AI...' badge for draft documents

- Animated pulse dot indicates AI is processing
- Distinct from regular 'draft' (manual unpublished)
- Adds @keyframes pulse to globals.css
- Falls back to DocumentStatusBadge for non-draft statuses"
```

---

### Task 4: Document viewer — client component with tabs

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx`
- Modify: `apps/web/app/(dashboard)/documents/[id]/page.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { ProcessingStatus } from './processing-status';
import { SummaryTab } from './summary-tab';
import { FlowchartTab } from './flowchart-tab';

type Props = {
  documentId: string;
  hasSummary: boolean;
  hasFlowchart: boolean;
};

type Tab = 'viewer' | 'summary' | 'flowchart';

export function DocumentViewer({ documentId, hasSummary, hasFlowchart }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('viewer');
  const [status, setStatus] = useState({
    hasSummary,
    hasFlowchart,
    isProcessing: !hasSummary || !hasFlowchart,
  });

  const handleStatusUpdate = (s: typeof status) => {
    setStatus(s);
  };

  const tabStyle = (isActive: boolean, isDisabled: boolean) => ({
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
    color: isDisabled
      ? 'var(--color-text-muted)'
      : isActive
      ? 'white'
      : 'var(--color-text-dark)',
    opacity: isDisabled ? 0.6 : 1,
  });

  return (
    <>
      <ProcessingStatus
        documentId={documentId}
        initialHasSummary={hasSummary}
        initialHasFlowchart={hasFlowchart}
        onUpdate={handleStatusUpdate}
      />

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
      </div>

      {activeTab === 'summary' && status.hasSummary && (
        <SummaryTab documentId={documentId} />
      )}

      {activeTab === 'flowchart' && status.hasFlowchart && (
        <FlowchartTab documentId={documentId} />
      )}

      {activeTab === 'viewer' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <p>Document viewer (Plan 6)</p>
        </div>
      )}

      {!status.hasSummary && activeTab === 'summary' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <p>AI chưa hoàn thành. Vui lòng đợi...</p>
        </div>
      )}
    </>
  );
}
```

2. Update `apps/web/app/(dashboard)/documents/[id]/page.tsx` — replace existing tabs/viewer section with new client component:

Find the section starting with `/* Tabs placeholder */` and replace everything from that comment down to the closing `</div>` of the outer `<div>` with:
```tsx
      <DocumentViewer
        documentId={doc.id}
        hasSummary={false}
        hasFlowchart={false}
      />
```

Add import at top:
```tsx
import { DocumentViewer } from './document-viewer';
```

3. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

4. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/page.tsx" "apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx"
git commit -m "feat(web): add document viewer with tabbed UI

- Client component with 3 tabs: Tài liệu / Tóm tắt / Sơ đồ
- Tabs disabled until AI pipeline finishes (polled via ProcessingStatus)
- Pass hasSummary/hasFlowchart from server (initial state)
- Inline styles per Tailwind v4 workaround memory"
```

---

### Task 5: ProcessingStatus — polling component

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/processing-status.tsx`

**Steps**:

1. Create `apps/web/app/(dashboard)/documents/[id]/processing-status.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
  initialHasSummary: boolean;
  initialHasFlowchart: boolean;
  onUpdate: (s: { hasSummary: boolean; hasFlowchart: boolean; isProcessing: boolean }) => void;
};

export function ProcessingStatus({
  documentId,
  initialHasSummary,
  initialHasFlowchart,
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
        isProcessing: !data.hasSummary || !data.hasFlowchart,
      });
    }
  }, [data, onUpdate]);

  return null; // Side-effect only component
}
```

2. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

3. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/processing-status.tsx"
git commit -m "feat(web): add ProcessingStatus polling component

- Uses tRPC documents.processingStatus proc (already in Plan 3)
- Polls every 5s while processing
- Auto-stops when both hasSummary + hasFlowchart are true
- Calls onUpdate to lift state up to DocumentViewer"
```

---

### Task 6: SummaryTab — render markdown + checklist

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/summary-tab.tsx`

**Steps**:

1. Create tRPC proc to fetch summary (already can be added):

Update `apps/web/lib/trpc/routers/documents.ts` — add `getSummary` proc:
```ts
getSummary: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    const doc = await prisma.document.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        title: true,
        summary: {
          select: {
            executiveSummary: true,
            checklist: true,
            modelUsed: true,
            createdAt: true,
          },
        },
      },
    });
    if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });
    return doc;
  }),
```

2. Create `apps/web/app/(dashboard)/documents/[id]/summary-tab.tsx`:
```tsx
'use client';

import ReactMarkdown from 'react-markdown';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
};

export function SummaryTab({ documentId }: Props) {
  const { data, isLoading, error } = trpc.documents.getSummary.useQuery({
    id: documentId,
  });

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

  if (error || !data) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: '#dc2626',
      }}>
        Lỗi tải tóm tắt
      </div>
    );
  }

  if (!data.summary) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        AI chưa tạo tóm tắt
      </div>
    );
  }

  const checklist = (data.summary.checklist as string[]) ?? [];

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>
        Tóm tắt
      </h2>
      <div style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '24px', color: 'var(--color-text-dark)' }}>
        <ReactMarkdown>{data.summary.executiveSummary}</ReactMarkdown>
      </div>

      {checklist.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-dark)' }}>
            Checklist
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {checklist.map((item, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px 0',
                  fontSize: '14px',
                  color: 'var(--color-text-dark)',
                }}
              >
                <input
                  type="checkbox"
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid var(--color-border)',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
      }}>
        Tạo bởi {data.summary.modelUsed} •{' '}
        {new Date(data.summary.createdAt).toLocaleString('vi-VN')}
      </div>
    </div>
  );
}
```

3. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

4. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/summary-tab.tsx" apps/web/lib/trpc/routers/documents.ts
git commit -m "feat(web): add SummaryTab with markdown + checklist rendering

- react-markdown renders executive_summary as markdown
- Checklist items rendered as interactive checkboxes (UI only)
- Shows model + timestamp at bottom
- Loading/error/empty states handled
- Adds getSummary tRPC proc"
```

---

### Task 7: FlowchartTab — render Mermaid

**Files**:
- Create: `apps/web/app/(dashboard)/documents/[id]/flowchart-tab.tsx`

**Steps**:

1. Create tRPC proc for flowchart:

Update `apps/web/lib/trpc/routers/documents.ts` — add `getFlowchart` proc:
```ts
getFlowchart: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    const doc = await prisma.document.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        title: true,
        flowchart: {
          select: {
            mermaidSyntax: true,
            createdAt: true,
          },
        },
      },
    });
    if (!doc) throw new TRPCError({ code: 'NOT_FOUND' });
    return doc;
  }),
```

2. Create `apps/web/app/(dashboard)/documents/[id]/flowchart-tab.tsx`:
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
};

export function FlowchartTab({ documentId }: Props) {
  const { data, isLoading, error } = trpc.documents.getFlowchart.useQuery({
    id: documentId,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidInitialized = useRef(false);

  useEffect(() => {
    if (!data?.flowchart?.mermaidSyntax || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      const mermaid = (await import('mermaid')).default;

      if (!mermaidInitialized.current) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });
        mermaidInitialized.current = true;
      }

      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, data.flowchart!.mermaidSyntax);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid render failed:', err);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<pre style="color: #dc2626; padding: 16px; background: #fef2f2; border-radius: 6px;">${err instanceof Error ? err.message : 'Render error'}</pre>`;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

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

  if (error || !data) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: '#dc2626',
      }}>
        Lỗi tải sơ đồ
      </div>
    );
  }

  if (!data.flowchart) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        AI chưa tạo sơ đồ
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
        Sơ đồ quy trình
      </h2>
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          minHeight: '200px',
          alignItems: 'center',
        }}
      />
      <details style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
        <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Xem Mermaid syntax
        </summary>
        <pre style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          fontSize: '12px',
          overflow: 'auto',
        }}>
          {data.flowchart.mermaidSyntax}
        </pre>
      </details>
    </div>
  );
}
```

3. Verify typecheck:
```bash
cd C:\Users\Admin\Desktop\web-noi-bo\apps\web
npm run typecheck
```

4. Commit:
```bash
git add "apps/web/app/(dashboard)/documents/[id]/flowchart-tab.tsx" apps/web/lib/trpc/routers/documents.ts
git commit -m "feat(web): add FlowchartTab with Mermaid rendering

- Dynamic import mermaid to avoid SSR issues
- Render mermaid syntax to SVG, inject into container
- Show collapsible raw syntax for debugging
- Loading/error/empty states handled
- Adds getFlowchart tRPC proc"
```

---

### Task 8: End-to-end verification

**Files**: none (verification only)

**Steps**:

1. Rebuild web service (deps mới + UI changes):
```bash
cd C:\Users\Admin\Desktop\web-noi-bo
docker compose --profile ai down
docker compose --profile ai up -d --build
```

2. Open http://localhost:3000

3. Test:
- Upload a PDF
- **Verify**: Upload returns quickly (< 1s), doesn't wait for AI
- **Verify**: Document row shows "Đang xử lý AI..." badge with pulse animation
- **Verify**: Open document → tabs "Tóm tắt" + "Sơ đồ" are disabled initially
- **Verify**: After ~4 minutes, polling detects hasSummary + hasFlowchart → tabs become enabled
- **Verify**: Click "Tóm tắt" → shows executive summary + checklist
- **Verify**: Click "Sơ đồ" → shows rendered Mermaid diagram

4. Check logs:
```bash
docker compose --profile ai logs web --tail 20
docker compose --profile ai logs ai-pipeline --tail 20
```

5. Verify in DB:
```bash
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT id, status FROM documents ORDER BY created_at DESC LIMIT 3;"
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT document_id, LEFT(executive_summary, 50) FROM document_summaries;"
docker exec rikkei-postgres psql -U rikkei -d rikkei_docs -c "SELECT document_id, LEFT(mermaid_syntax, 50) FROM document_flowcharts;"
```

Expected:
- New doc has status='published' (after ~4 min)
- Summary + flowchart rows present

---

## Self-Review

### Spec Coverage
✅ Plan 4 scope:
- "Tab 'Sơ đồ': render Mermaid" → Task 7 (FlowchartTab)
- "Tab 'Tóm tắt': executive summary + checklist" → Task 6 (SummaryTab)
- Real-time UX feedback → Tasks 2-5 (fire-and-forget + polling)

### Placeholder Scan
- No TODO/TBD thật
- Tab "Tài liệu" placeholder is intentional (Plan 6)
- Document viewer placeholder is intentional (Plan 6)

### Type/Name Consistency
- Props `hasSummary` / `hasFlowchart` consistent across files
- tRPC proc names: `processingStatus`, `getSummary`, `getFlowchart`

### Memory Compliance
- Inline styles everywhere (per [[tailwind-v4-spacing-bug]])
- Reuses existing tRPC procs from Plan 3
- No new env vars
- No DB migrations needed

---

## Execution Handoff

**Subagent-driven development**. Mỗi task 1-7 sẽ được dispatch subagent với:
- Task number + description
- Context: đọc CLAUDE.md + relevant files
- 2 vòng review (spec compliance + code quality)

Task 8 (verification) chạy trực tiếp bởi main loop.