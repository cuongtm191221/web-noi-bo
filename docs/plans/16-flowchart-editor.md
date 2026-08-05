# Plan 16: Visual Flowchart Editor (Minh họa) — v2

> **Status**: Draft v2 (đã cập nhật theo feedback user)
> **Date**: 2026-08-06
> **Goal**: Thêm tab "Minh họa" với visual flowchart editor cho admin/editor. Bỏ phần AI flowchart (Mermaid) — chỉ giữ manual editor.

---

## 1. Thay đổi so với v1

| Item | v1 | v2 |
|---|---|---|
| **Tab "Mục lục"** | Render Mermaid AI flowchart | Render outline cây (giữ nguyên) |
| **Tab "Minh họa"** | Editor mới | Editor mới (giữ nguyên scope) |
| **AI pipeline mermaid** | Generate flowchart | **Bỏ** — pipeline chỉ tạo outline + summary + citation |
| **Library Mermaid** | Render flowchart AI | **Chỉ dùng** cho tab outline (nếu cần) hoặc **bỏ hẳn** |
| **DocumentFlowchart table** | Lưu `mermaidSyntax` (overload) | **Đổi** → chỉ lưu `diagramJson` cho editor |
| **DocumentOutline** | Không có | **Thêm** table riêng cho outline data |
| **Tổng tabs** | 4 → 5 | **5** (Tài liệu / Tóm tắt / Mục lục / Trích dẫn / Minh họa) |

---

## 2. Schema refactor

### 2.1 Bỏ AI flowchart trong pipeline

`apps/ai-pipeline/db.py` — xoá function `save_flowchart()` và mọi reference.

`apps/ai-pipeline/main.py` — xoá bước generate flowchart. Chỉ giữ:
- `save_summary(...)`
- `save_citations(...)`
- `save_outline(...)` → ghi vào `document_outlines` (table mới)

### 2.2 Migration: tách outline + đổi flowchart table

```prisma
// Xoá bảng cũ, tạo 2 bảng mới (rename rõ ràng)
model DocumentDiagram {
  id              String   @id @default(cuid())
  documentId      String   @unique @map("document_id")
  document        Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  diagramJson     Json     @map("diagram_json")    // React Flow nodes + edges
  diagramVersion  Int      @default(0) @map("diagram_version")
  updatedById     String?  @map("updated_by_id")
  updatedBy       User?    @relation(fields: [updatedById], references: [id])
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("document_diagrams")
}

model DocumentOutline {
  id           String   @id @default(cuid())
  documentId   String   @unique @map("document_id")
  document     Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  outlineJson  Json     @map("outline_json")      // Cây heading
  modelUsed    String   @map("model_used")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("document_outlines")
}
```

### 2.3 Migration script

Tạo migration mới `20260806120000_split_diagram_outline`:
1. Đổi tên `document_flowcharts` → `document_diagrams`
2. Đổi `mermaidSyntax` → `diagramJson` (parse thử JSON; nếu fail → set NULL)
3. Thêm `document_outlines`, copy outline từ `mermaidSyntax` cũ (những row là JSON outline)
4. Drop column `mermaidSyntax` cũ
5. Thêm `diagramVersion`, `updatedById`, `updatedAt` vào `document_diagrams`

```bash
cd apps/web
npx prisma migrate dev --name split_diagram_outline
```

⚠️ **Cẩn thận**: Nếu có data AI flowchart cũ (mermaid string), sẽ mất khi rename. User đã nói "không quan tâm phần đấy nữa" → chấp nhận.

---

## 3. Library đề xuất

**Chọn**: **@xyflow/react (React Flow v12)**

| Reason | Detail |
|---|---|
| Bundle size | ~150KB, lazy-load được |
| License | MIT (free commercial) |
| Custom node | Tự build, full control |
| Community | Lớn, docs đầy đủ |
| React 19 tương thích | ✅ |

```bash
cd apps/web
npm install @xyflow/react
# Có thể bỏ 'mermaid' sau khi Mục lục không dùng nữa
```

---

## 4. File mới / File sửa

### 4.1 File XOÁ

| File | Lý do |
|---|---|
| `apps/web/app/(dashboard)/documents/[id]/flowchart-tab.tsx` | AI flowchart không còn |
| `apps/ai-pipeline/flowchart_gen.py` | AI generate flowchart không còn |

### 4.2 File mới

| File | Mục đích | LOC |
|---|---|---|
| `apps/web/app/(dashboard)/documents/[id]/diagram-tab.tsx` | Main tab Minh họa | 250 |
| `apps/web/components/flowchart/canvas.tsx` | React Flow Canvas (client) | 200 |
| `apps/web/components/flowchart/toolbar.tsx` | Add node, undo, save, zoom | 250 |
| `apps/web/components/flowchart/inspector.tsx` | Side panel sửa node | 350 |
| `apps/web/components/flowchart/image-uploader.tsx` | Upload ảnh inline | 120 |
| `apps/web/components/flowchart/nodes/default-node.tsx` | Rectangle | 100 |
| `apps/web/components/flowchart/nodes/diamond-node.tsx` | Decision | 70 |
| `apps/web/components/flowchart/nodes/ellipse-node.tsx` | Start/End | 70 |
| `apps/web/components/flowchart/nodes/parallelogram-node.tsx` | Input/Output | 70 |
| `apps/web/app/api/documents/[id]/diagram/route.ts` | GET/PUT diagram | 100 |
| `apps/web/app/api/uploads/image/route.ts` | POST upload ảnh | 80 |

**Total new**: ~1660 LOC

### 4.3 File sửa

| File | Sửa gì |
|---|---|
| `apps/web/prisma/schema.prisma` | Tách DocumentFlowchart → DocumentDiagram + DocumentOutline |
| `apps/web/app/(dashboard)/documents/[id]/page.tsx` | Thêm tab, update canEdit logic (bao gồm `editor`) |
| `apps/web/app/(dashboard)/documents/[id]/document-viewer.tsx` | Thêm tab `diagram`, props mới |
| `apps/web/app/(dashboard)/documents/[id]/outline-tab.tsx` | Đổi data source: `document_outlines` |
| `apps/web/app/(dashboard)/documents/[id]/processing-status.tsx` | Bỏ `hasFlowchart`, thêm `hasDiagram` |
| `apps/web/app/api/documents/[id]/outline/route.ts` | Đổi từ flowchart table → outline table |
| `apps/web/app/api/documents/[id]/route.ts` | Update canEdit (bao gồm editor role) |
| `apps/web/lib/auth.ts` | Helper `canEditDocument(session, doc)` |
| `apps/web/lib/trpc/routers/documents.ts` | Thêm `getDiagram`/`saveDiagram` procedures |
| `apps/ai-pipeline/db.py` | Xoá `save_flowchart()`, thêm `save_outline()` |
| `apps/ai-pipeline/main.py` | Bỏ flowchart step, thêm outline save step |
| `apps/web/app/api/mcp/route.ts` | Bỏ tool `get_summary` (vì Mermaid cũ không còn) — hoặc giữ fallback |

---

## 5. UI / UX

### 5.1 Editor mode (admin + editor)

```
┌──────────────────────────────────────────────────────────┐
│ Minh họa                                  [Save] [Reset] │
├──────────────────────────────────────────────────────────┤
│ [+ Rectangle] [+ Diamond] [+ Ellipse] [+ Parallelogram] │
│ [Undo] [Redo] [Zoom +] [Zoom -] [Fit]   Saved 5s ago    │
├──────────────────────────────────┬───────────────────────┤
│                                  │  INSPECTOR             │
│        Canvas (React Flow)       │                       │
│         ┌────────┐                │  Title: Bước 1        │
│         │  Start │                │  Detail: ...          │
│         └────┬───┘                │                       │
│              │                   │  Background           │
│         ┌────▼────┐              │  [color picker]       │
│         │  Bước 1 │              │                       │
│         └─────────┘              │  Text color           │
│                                  │  [color picker]       │
│                                  │  Font                 │
│                                  │  Size [14] Weight[..] │
│                                  │                       │
│                                  │  Image                │
│                                  │  [Upload]             │
└──────────────────────────────────┴───────────────────────┘
```

### 5.2 Viewer mode (role: viewer)

- Cùng React Flow, nhưng `nodesDraggable={false}`, `nodesConnectable={false}`, `elementsSelectable={false}`
- Có zoom + pan
- Không có toolbar, inspector

---

## 6. API design

### 6.1 GET /api/documents/[id]/diagram

```ts
// Response
{
  "diagramJson": { "nodes": [...], "edges": [...], "viewport": {...} } | null,
  "diagramVersion": 3,
  "updatedAt": "2026-08-06T...",
  "updatedBy": { "id": "...", "name": "..." }
}

// 200 nếu có, 404 nếu chưa tạo
```

### 6.2 PUT /api/documents/[id]/diagram

```ts
// Request body
{
  "diagramJson": { "nodes": [...], "edges": [...], "viewport": {...} },
  "expectedVersion": 2   // optimistic locking
}

// Response
{
  "diagramVersion": 3,
  "updatedAt": "..."
}

// Status: 200 OK, 403 nếu không phải admin/editor/uploader
// 409 nếu expectedVersion mismatch
```

### 6.3 POST /api/uploads/image

Upload ảnh cho node, lưu `/apps/web/uploads/flowchart-images/{cuid}.{ext}`.

```ts
// Request: multipart/form-data, field 'file'
// Response
{
  "url": "/uploads/flowchart-images/clxyz123.png",
  "width": 800, "height": 600, "size": 102400
}

// Limit: 5MB, MIME: png/jpg/gif/webp
```

### 6.4 Permission matrix

| Action | admin | editor | viewer | uploader (non-editor) |
|---|---|---|---|---|
| View tab Minh họa | ✅ | ✅ | ✅ | ✅ |
| Edit (drag, add, delete) | ✅ | ✅ | ❌ | ✅ (chỉ của mình) |
| Save diagram | ✅ | ✅ | ❌ | ✅ (chỉ của mình) |
| Upload ảnh | ✅ | ✅ | ❌ | ✅ (chỉ của mình) |

**Helper canEditDocument** trong `lib/auth.ts`:

```ts
export function canEditDocument(session: Session | null, doc: { uploaderId: string }): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  if (role === 'admin' || role === 'editor') return true;  // full edit
  return doc.uploaderId === session.user.id;  // uploader
}
```

---

## 7. Diagram JSON schema (validate bằng Zod)

```ts
const DiagramSchema = z.object({
  version: z.literal(1),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(['default', 'diamond', 'ellipse', 'parallelogram']),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.object({
      title: z.string().max(100),
      detail: z.string().max(2000).optional(),
      bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      fontSize: z.number().int().min(8).max(48),
      fontWeight: z.enum(['400', '500', '600', '700', '800']),
      imageUrl: z.string().optional(),
    }),
    width: z.number().positive(),
    height: z.number().positive(),
  })).max(200),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().max(100).optional(),
    type: z.enum(['default', 'smoothstep', 'step']).default('smoothstep'),
  })).max(300),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number().min(0.1).max(4) }),
});
```

---

## 8. Implementation phases

### Phase 1: Schema + cleanup AI (2 ngày)

1. ✅ **Bỏ AI flowchart generation** trong `apps/ai-pipeline/main.py` + `db.py`
2. ✅ Migration: tách `document_flowcharts` → `document_diagrams` + `document_outlines`
3. ✅ Helper `canEditDocument(session, doc)` trong `lib/auth.ts`
4. ✅ Xoá `flowchart-tab.tsx`, sửa `outline-tab.tsx` dùng `document_outlines`
5. ✅ Update `processing-status.tsx`: `hasFlowchart` → `hasOutline`, `hasDiagram`
6. ✅ Sửa `api/documents/[id]/route.ts` (update role check)
7. ✅ Sửa `api/mcp/route.ts` (bỏ hoặc điều chỉnh tool `get_summary`)
8. ✅ Xoá `apps/ai-pipeline/flowchart_gen.py`
9. ✅ Test thủ công: tab Mục lục vẫn hoạt động, tab Minh họa xuất hiện (empty state)

### Phase 2: API cho editor (1 ngày)

10. ✅ `GET /api/documents/[id]/diagram` (GET + 404 nếu chưa có)
11. ✅ `PUT /api/documents/[id]/diagram` (PUT với optimistic locking)
12. ✅ `POST /api/uploads/image` (upload ảnh, validate MIME + size)
13. ✅ Test API với curl

### Phase 3: Editor canvas (3 ngày)

14. ✅ Cài `@xyflow/react`
15. ✅ `canvas.tsx` — React Flow wrapper với theme Rikkei
16. ✅ 4 custom node types (default, diamond, ellipse, parallelogram)
17. ✅ `toolbar.tsx` (add node buttons + undo/redo + zoom controls)
18. ✅ `inspector.tsx` (edit title, detail, color, font, image)
19. ✅ `image-uploader.tsx` (gọi API upload, preview)
20. ✅ `diagram-tab.tsx` — wire tất cả lại, save/load + permission check

### Phase 4: Polish (1 ngày)

21. ✅ Auto-save draft vào localStorage (mỗi 30s)
22. ✅ Save indicator ("Saving..." / "Saved 5s ago")
23. ✅ Activity log: ghi `DIAGRAM_EDIT` khi save
24. ✅ Toast notification
25. ✅ Error handling (save fail → retry, upload fail → message)
26. ✅ Empty state: nút "Tạo flowchart mới"
27. ✅ Mobile responsive (viewer OK, editor chỉ desktop ≥768px)

### Phase 5: Test + docs (0.5 ngày)

28. ✅ Manual test end-to-end (admin/editor/viewer)
29. ✅ Playwright E2E: admin edit + viewer read
30. ✅ Cập nhật DEPLOY.md
31. ✅ Cleanup code, lint, typecheck

**Total**: 7.5 ngày (1 người full-time)

---

## 9. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Bundle size @xyflow | TTI +300ms | Lazy-load EditorTab chỉ khi click |
| Diagram > 100 nodes lag | UX kém | React Flow đã optimize, max 200 nodes qua Zod |
| Image upload đầy disk | Storage | 5MB limit, GC khi xoá document |
| Diagram JSON corrupt | Data loss | Zod validate trước save |
| Race condition 2 users | Overwrite | Optimistic locking qua `diagramVersion` |
| Migration phá data cũ | Mất data | User đã đồng ý bỏ AI flowchart |

---

## 10. Success criteria

- ✅ Admin/editor tạo flowchart < 5 phút (with tutorial)
- ✅ 4 node types hoạt động + edit style
- ✅ Upload ảnh vào node thành công
- ✅ Save thành công, reload giữ state
- ✅ Viewer thấy read-only, không có controls
- ✅ Tab Mục lục vẫn hoạt động (refactor đúng)
- ✅ Lighthouse Performance > 80
- ✅ Không còn reference đến Mermaid

---

## 11. Out of scope

- Realtime multi-user edit
- Diagram versioning + rollback
- Export PNG/SVG
- AI auto-suggest layout
- Import từ file Visio/Lucidchart
- Comment/discussion per node

---

## 12. Decisions từ session

- ✅ **AI flowchart BỎ** — pipeline không gen flowchart nữa
- ✅ **Mục lục GIỮ** — tách thành table riêng `document_outlines`
- ✅ **Editor dùng React Flow v12 (@xyflow/react)**
- ✅ **5 tabs cuối cùng**: Tài liệu, Tóm tắt, Mục lục, Trích dẫn, Minh họa
- ✅ **Permission**: admin/editor/uploader được edit, viewer chỉ xem

---

**Reviewer**: cuongtm191221
**Approve**: chờ user xác nhận trước khi implement Phase 1
