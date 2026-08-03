# Design Document: Web Nội Bộ Quản Lý Tài Liệu Quy Trình

**Ngày tạo**: 2026-07-31
**Cập nhật lần cuối**: 2026-07-31 (mở rộng multi-format upload + Rikkei Education branding)
**Trạng thái**: Draft — chờ user duyệt
**Spec-Driven Development** theo [obra/superpowers](https://github.com/obra/superpowers)
**Brand reference**: [https://qlrikkeiedu.web.app/](https://qlrikkeiedu.web.app/)

---

## 1. Vision & Goals

### 1.1 Vấn đề
Trường học/tổ chức giáo dục đang quản lý tài liệu quy trình/quy định rải rác (Google Drive, email, in ấn). Thầy cô khó tra cứu, không có tóm tắt, không có sơ đồ trực quan, version không thống nhất.

### 1.2 Mục tiêu
Xây dựng **website nội bộ** tập trung để thầy cô:
- Upload tài liệu quy trình/quy định ở nhiều định dạng: **DOCX, XLSX, PDF, PPTX, MD** (và mở rộng các file tài liệu khác sau).
- Hệ thống **tự động tóm tắt** (executive summary + checklist các bước).
- **Tạo flowchart Mermaid** trực quan từ nội dung.
- **Trích dẫn nguồn** (citation) — mỗi phần tóm tắt liên kết về đúng trang/đoạn gốc.
- **Xuất MCP server** để agent bên ngoài (Claude, custom agent) tra cứu tài liệu qua giao thức chuẩn.

### 1.3 Quy mô & ràng buộc
- **< 50 thầy cô**, miễn phí, tự host trên máy chủ nội bộ trường.
- Ngôn ngữ tài liệu: **90% tiếng Việt + một chút tiếng Anh** (tổ chức giáo dục theo hướng doanh nghiệp).
- Tài liệu quy trình ngắn (5-10 trang), không cần versioning phức tạp.
- Không cần OCR scan ở MVP (tài liệu digital-first).

### 1.4 Success Criteria
- Upload file ở 5 định dạng (PDF, DOCX, XLSX, PPTX, MD) → sau 30-60 giây có summary + checklist + flowchart.
- Citation trong summary click được → viewer scroll tới đúng vị trí (page/slide/sheet/đoạn), highlight đúng đoạn.
- MCP server expose 5 tools, agent bên ngoài connect và query được.
- Docker compose up toàn bộ stack < 5 phút (sau khi pull images).
- Backup Postgres tự động hàng ngày.

---

## 2. Personas

| Persona | Mô tả | Quyền |
|---------|-------|-------|
| **Admin** | IT/admin trường, quản lý user, category, xem audit log | Tất cả quyền |
| **Editor** | Thầy cô chuyên môn, upload/sửa tài liệu, generate summary/flowchart | Upload, sửa, xem |
| **Viewer** | Thầy cô chỉ cần tra cứu, không upload | Chỉ xem + search + dùng MCP |
| **External Agent** | Claude Desktop, custom agent kết nối qua MCP | Theo API key/scope |

---

## 3. Functional Requirements

### 3.1 MVP (Phải có)

**Authentication & Authorization**
- Đăng nhập bằng email + password (bcrypt hash).
- 3 roles: admin, editor, viewer.
- Admin tạo tài khoản qua trang admin (không self-register).
- Route protection: `/admin/*` chỉ admin, `/documents/upload` cần editor+.

**Document Management**
- Upload các định dạng tài liệu: **PDF, DOCX, XLSX, PPTX, MD** (mở rộng: TXT, RTF, ODT sau). Max 50MB mỗi file.
- Validate MIME type + magic number (không chỉ check extension).
- Lưu file vào `apps/web/uploads/{document_id}.{ext}`.
- Phân loại theo Category (cây 2 cấp được).
- Status: `draft | published | archived`.
- Search theo title (PostgreSQL `ILIKE`) + full-text (PostgreSQL `tsvector`).

**AI Pipeline**
- Auto-trigger sau khi upload: parse → chunk → summarize → flowchart.
- **Multi-format parsing** với fallback chain:
  - **PDF**: `pypdf` → fallback `pdfplumber` (cho PDF phức tạp/scan).
  - **DOCX**: `python-docx`.
  - **PPTX**: `python-pptx` (extract text từ slides, kèm slide number).
  - **XLSX**: `openpyxl` (extract từng sheet, header row + data rows).
  - **MD/TXT**: parser đơn giản (giữ nguyên cấu trúc heading).
- Chunk: ~500 tokens, overlap 50 tokens, track `page_number`/`slide_number`/`sheet_name` tuỳ loại file.
- Summarize: gọi Ollama `qwen2.5:7b`, output JSON `{ executive_summary, checklist, citations }`.
- Flowchart: gọi Ollama với prompt riêng → output Mermaid syntax thuần.
- Lưu vào `DocumentSummary`, `DocumentFlowchart`, `Citation` tables.

**Document Viewer**
- Render đúng viewer theo định dạng:
  - **PDF**: `react-pdf` (hiển thị theo page).
  - **DOCX**: server-side convert với `mammoth` → render HTML.
  - **PPTX**: extract slides thành ảnh (`python-pptx` + headless conversion hoặc render HTML slide).
  - **XLSX**: render bảng (`xlsx` npm hoặc server-side convert sang HTML table).
  - **MD/TXT**: render trực tiếp với markdown parser + syntax highlighting.
- Citation reference có dạng `[trang X]`, `[slide X]`, `[sheet Tên sheet, hàng Y]` tuỳ loại file.
- Sidebar: tabs [Tóm tắt, Sơ đồ, Trích dẫn].
- Tab "Tóm tắt": executive summary + checklist, citation dạng `[1]`, `[2]` inline.
- Tab "Sơ đồ": render Mermaid (client-side với `mermaid` npm).
- Tab "Trích dẫn": danh sách citation, click → scroll viewer tới đúng vị trí, highlight.

**Citation & Highlighting**
- Mỗi citation có: `claim_text`, `location` (polymorphic — page/slide/sheet/cell), `chunk_id`.
- **Location polymorphic** theo file type:
  - PDF: `page_number`.
  - DOCX/MD/TXT: `section_index + char_offset`.
  - PPTX: `slide_number`.
  - XLSX: `sheet_name + row_number + column_letter`.
- Click citation → viewer scroll + highlight đúng vị trí.
- Validate location nằm trong range file (LLM có thể hallucinate).

**MCP Server**
- 4 tools: `search_documents`, `get_document`, `list_categories`, `get_summary`.
- Transport: SSE (Server-Sent Events) cho flexibility, fallback stdio cho local.
- Auth: Bearer token đơn giản (env var `MCP_API_KEY`).
- Document tools trong README.

### 3.2 Nice-to-have (sau MVP)
- Versioning (v1, v2, v3) với diff.
- OCR cho PDF scan (tesseract).
- Multi-flowchart (chia theo chương).
- Comment/discussion trên document.
- Export flowchart ra SVG/PNG.
- Web UI để edit Mermaid source manual.

### 3.3 Out of Scope (MVP)
- OAuth/SSO (Google/Microsoft).
- Real-time collaboration.
- Mobile app.
- Multi-tenant.
- Cloud deployment (chỉ self-host).

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Upload + parse + summarize PDF 5 trang: < 60 giây.
- Search response: < 500ms.
- Viewer render PDF: < 2 giây cho 10 trang.
- Flowchart render: < 1 giây.

### 4.2 Security
- Password hash bằng bcrypt (cost 12).
- Session JWT, httpOnly cookie, secure flag in production.
- File upload validate MIME type + magic number.
- Tên file sanitize, không path traversal.
- MCP server require API key.
- Audit log mọi action: upload, delete, login, summary_generate.

### 4.3 Reliability
- Postgres volume named (không bind mount) → data persist qua container restart.
- AI service graceful degradation: nếu Ollama down, summary retry 3 lần, sau đó log error + cho phép manual retry.
- Healthcheck endpoint cho tất cả services.

### 4.4 Backup
- Script `backup-pg.sh` chạy hàng ngày qua cron: `pg_dump` → gzip → lưu `backups/`.
- Giữ 30 ngày backup gần nhất.
- Uploaded files backup riêng (rsync sang ổ khác).

### 4.5 Privacy
- Dữ liệu tài liệu KHÔNG rời khỏi máy chủ (self-host, Ollama local).
- AI processing hoàn toàn local — không gọi cloud API.

---

## 5. Brand Identity (Rikkei Education)

Toàn bộ giao diện web nội bộ phải tuân thủ brand identity của Rikkei Education, trích xuất từ [https://qlrikkeiedu.web.app/](https://qlrikkeiedu.web.app/).

### 5.1 Color Palette

**Brand colors** (CSS variables từ site gốc):

| Token | Hex | Mục đích |
|-------|-----|----------|
| `--primary` | `#0d226b` | Primary navy — buttons chính, heading nổi bật, active state |
| `--primary-hover` | `#07154b` | Hover state của primary |
| `--rikkei-blue` | `#005c9e` | Rikkei blue — links, breadcrumb active, accent |
| `--rikkei-green` | `#009f4d` | Rikkei green — success states, badges "đã duyệt", positive indicators |
| `--bg-cream` | `#f2f7ff` | Background tổng thể (nhẹ, dễ chịu cho mắt) |
| `--bg-sidebar` | `#ffffff` | Background sidebar (trắng) |
| `--text-dark` | `#1e293b` | Text chính |
| `--text-muted` | `#64748b` | Text phụ, helper text |
| `--border-color` | `#e2e8f0` | Border, divider |

**Secondary palette** (dùng cho status, badge):

| Token | Hex | Mục đích |
|-------|-----|----------|
| Rikkei light blue | `#0284c7` | Info badge |
| Rikkei dark green | `#047857` / `#065f46` | Success darker |
| Rikkei emerald | `#10b981` / `#059669` | Success states |
| Rikkei red | (chưa extract) | Error — sẽ dùng `#dc2626` Tailwind mặc định |
| Rikkei yellow | (chưa extract) | Warning — sẽ dùng `#f59e0b` Tailwind mặc định |

**Dark mode** (tùy chọn sau MVP, đã có sẵn palette):
- `--bg-cream` → `#0b132b`
- `--bg-sidebar` → `#1c2541`
- `--sidebar-header` → `#3a506b`
- `--primary-text-theme` → `#38bdf8`

### 5.2 Typography

**Font family** (load qua Google Fonts):
```
'Be Vietnam Pro', 'Inter', 'Plus Jakarta Sans', 'Segoe UI', sans-serif
```

- **Primary**: **Be Vietnam Pro** (Vietnamese-friendly, weights 300-900).
- **Fallback**: Inter (cho compatibility).
- **Body**: 14px, antialiased.
- **Heading scale** (từ site):
  - H1: 36px / weight 800
  - H2: 30px / weight 800
  - H3: 20px / weight 700
  - H4: 15-16px / weight 700
  - Body small: 12-13px / weight 500
  - Label: 12.5px / weight 600
  - Code/mono: monospace / 11.5px

### 5.3 Design Rules

**Border radius** (nhất quán):
- Pills/Badges: `9999px` (rounded full)
- Buttons/Inputs: `8px` hoặc `10px`
- Cards: `12px` hoặc `16px`
- Modals: `16px` hoặc `20px`
- Avatars/Circles: `50%`

**Shadow** (subtle, professional):
- `--shadow-sm`: `0 1px 2px 0 rgba(0,0,0,0.05)`
- `--shadow-md`: `0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)`
- `--shadow-lg`: `0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)`

**Transitions**:
- `--transition-smooth`: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` (chuẩn Material).

### 5.4 Layout Pattern

Site gốc dùng pattern **sidebar + main content**:

```
┌────────────┬─────────────────────────┐
│            │  Header (breadcrumb)    │
│  Sidebar   ├─────────────────────────┤
│  270px     │                         │
│  (fixed)   │  Main content           │
│            │  (cards, tables, etc.)  │
│  - Logo    │                         │
│  - Menu    │                         │
│  - User    │                         │
│            │                         │
└────────────┴─────────────────────────┘
```

**Áp dụng cho web nội bộ**:
- Sidebar trái (270px, fixed) với logo Rikkei Education + menu điều hướng.
- Main content: breadcrumbs ở top, content cards bên dưới.
- Mobile: sidebar collapse thành drawer (toggle button).

### 5.5 Logo & Branding

- Logo lấy từ `https://qlrikkeiedu.web.app/` (extract từ assets). Lưu vào `apps/web/public/rikkei-logo.svg`.
- Mọi trang phải có logo ở header sidebar.
- Footer có dòng "© 2026 Rikkei Education — Hệ thống quản lý tài liệu nội bộ".
- **Không tự ý thay đổi logo hoặc màu sắc brand** mà không có approval từ Rikkei Education.

### 5.6 Component Style Guidelines

| Component | Style |
|-----------|-------|
| **Buttons primary** | Background `--primary` (#0d226b), text white, rounded 8px, hover → `--primary-hover` |
| **Buttons secondary** | Background white, border `--border-color`, text `--primary` |
| **Buttons success** | Background `--rikkei-green`, text white (dùng cho "Duyệt", "Đăng" tài liệu) |
| **Cards** | White bg, `--shadow-sm`, rounded 12px, padding 16-20px |
| **Inputs** | Border `--border-color`, rounded 8px, focus ring `--rikkei-blue` |
| **Badges status** | Pill shape (9999px), font 12.5px weight 600 |
| **Tables** | Header bg `--bg-cream`, rows alternating white/cream, hover highlight |
| **Sidebar items** | Active bg `rgba(13, 34, 107, 0.08)`, active text `--primary`, icon + text |

### 5.7 Theme Configuration

shadcn/ui config + Tailwind config phải map Rikkei tokens:

```ts
// tailwind.config.ts (extract)
colors: {
  primary: { DEFAULT: '#0d226b', hover: '#07154b' },
  'rikkei-blue': '#005c9e',
  'rikkei-green': '#009f4d',
  'bg-cream': '#f2f7ff',
  'text-dark': '#1e293b',
  'text-muted': '#64748b',
  'border-color': '#e2e8f0',
}
fontFamily: {
  sans: ['Be Vietnam Pro', 'Inter', 'Plus Jakarta Sans', 'sans-serif'],
}
borderRadius: {
  sm: '6px', md: '10px', lg: '12px', xl: '16px', '2xl': '20px',
}
```

CSS variables sẽ được khai báo trong `apps/web/app/globals.css` để dùng chung với shadcn.

### 5.8 Iconography

- Dùng **Lucide React** (mặc định của shadcn) — phong cách minimal, stroke 1.5-2px.
- Icons phải match tone brand (màu `--primary` cho active, `--text-muted` cho inactive).

---

## 6. Architecture

### 5.1 Component Diagram

```
[Browser]
    ↕ HTTPS
[Next.js :3000] ─── tRPC ──→ [PostgreSQL :5432]
    │
    └── HTTP ──→ [ai-pipeline :8000]
                      │
                      └── HTTP ──→ [Ollama :11434]

[External Agent] ── SSE/stdio ──→ [MCP Server :8765] ──→ [PostgreSQL]
```

### 5.2 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| UI | Tailwind CSS + shadcn/ui (theme = Rikkei Education) | v4 + latest |
| API | tRPC | 11.x |
| ORM | Prisma | 6.x |
| Database | PostgreSQL | 16 (Docker) |
| Auth | Auth.js (NextAuth v5) | beta |
| PDF Rendering | react-pdf | latest |
| DOCX Render | mammoth (server-side → HTML) | latest |
| XLSX Render | xlsx (client) hoặc convert HTML | latest |
| PPTX Render | python-pptx + headless conversion | latest |
| MD Render | react-markdown + syntax highlight | latest |
| Mermaid | mermaid (npm) | latest |
| File Upload | busboy + python-magic (validate MIME) | latest |
| Backend (AI) | FastAPI | latest |
| MCP | mcp (Python SDK) | latest |
| AI Model | Ollama + qwen2.5:7b | latest |
| Container | Docker Compose | v2 |

### 5.3 Data Model (Prisma)

```prisma
enum Role { admin, editor, viewer }
enum DocumentStatus { draft, published, archived }
enum FileType { pdf, docx, xlsx, pptx, md, txt }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  role          Role     @default(viewer)
  createdAt     DateTime @default(now())
  documents     Document[]
  auditLogs     AuditLog[]
}

model Category {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  parentId  String?
  parent    Category? @relation("CategoryToParent", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryToParent")
  documents Document[]
}

model Document {
  id           String   @id @default(cuid())
  title        String
  categoryId   String
  category     Category @relation(fields: [categoryId], references: [id])
  filePath     String
  fileType     FileType
  fileSize     Int
  uploadedById String
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  status       DocumentStatus @default(draft)
  pageCount    Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  chunks       DocumentChunk[]
  summaries    DocumentSummary[]
  flowcharts   DocumentFlowchart[]
  citations    Citation[]
}

model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkIndex  Int
  content     String
  pageNumber  Int?
  slideNumber Int?
  sheetName   String?
  rowNumber   Int?
  columnLetter String?
  metadata    Json?
  @@index([documentId, chunkIndex])
}

model DocumentSummary {
  id            String   @id @default(cuid())
  documentId    String
  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content       Json     // { executive_summary, checklist, raw_response }
  modelVersion  String
  generatedAt   DateTime @default(now())
  citations     Citation[]
}

model DocumentFlowchart {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  mermaidSource String
  generatedAt DateTime @default(now())
}

model Citation {
  id                  String   @id @default(cuid())
  documentId          String
  document            Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  sourceChunkId       String?
  pageNumber          Int?
  slideNumber         Int?
  sheetName           String?
  rowNumber           Int?
  columnLetter        String?
  sectionIndex        Int?
  charOffset          Int?
  claimText           String
  referencedSummaryId String?
  referencedSummary   DocumentSummary? @relation(fields: [referencedSummaryId], references: [id], onDelete: SetNull)
  @@index([documentId])
}

model AuditLog {
  id           String   @id @default(cuid())
  userId       String?
  user         User?    @relation(fields: [userId], references: [id])
  action       String   // 'upload', 'delete', 'login', 'summary_generate', 'flowchart_generate'
  resourceType String
  resourceId   String?
  metadata     Json?
  timestamp    DateTime @default(now())
  @@index([timestamp])
}
```

### 5.4 API Contract (tRPC routers)

- `auth.signIn`, `auth.signOut`, `auth.me`
- `users.list`, `users.create`, `users.update`, `users.delete` (admin only)
- `categories.list`, `categories.create`, `categories.update`, `categories.delete`
- `documents.list`, `documents.get`, `documents.upload`, `documents.delete`, `documents.search`
- `ai.summarize(documentId)`, `ai.generateFlowchart(documentId)`, `ai.regenerateSummary(documentId)`
- `citations.getForDocument(documentId)`
- `auditLogs.list` (admin only)

### 5.5 MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `search_documents` | `query: str, category?: str, file_type?: str, limit?: int` | `{ id, title, category, file_type, snippet }[]` |
| `get_document` | `id: str` | `{ id, title, category, file_type, page_count, chunks: [{idx, location, content}] }` |
| `list_categories` | — | `{ id, name, slug, parent_id }[]` |
| `list_file_types` | — | `{ value, label, extensions }[]` |
| `get_summary` | `document_id: str` | `{ executive_summary, checklist, citations: [{location, claim}] }` |

---

## 7. File Structure

```
C:\Users\Admin\Desktop\web-noi-bo\
├── .git/
├── .gitignore
├── .env.example
├── .nvmrc                                  # node 24
├── package.json                            # npm workspaces root
├── docker-compose.yml                      # postgres + ollama + ai-pipeline + mcp-server
├── README.md
├── CLAUDE.md                               # architecture + conventions
├── docs/
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-07-31-internal-document-mgmt-design.md   # ← file này
│       └── plans/
│           ├── 01-foundation.md
│           ├── 02-document-upload.md
│           ├── 03-ai-pipeline.md
│           ├── 04-flowchart.md
│           ├── 05-citation.md
│           ├── 06-mcp-server.md
│           └── 07-polish-deploy.md
├── apps/
│   ├── web/                                # Next.js 15
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts                  # bodySizeLimit: '50mb'
│   │   ├── tailwind.config.ts
│   │   ├── components.json                 # shadcn config
│   │   ├── .env.local                      # gitignored
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── uploads/                        # gitignored, mounted volume
│   │   ├── public/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── (no register - admin only)
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── documents/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── upload/page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── summary/page.tsx
│   │   │   │   │       ├── flowchart/page.tsx
│   │   │   │   │       └── citations/page.tsx
│   │   │   │   └── admin/
│   │   │   │       ├── users/page.tsx
│   │   │   │       ├── categories/page.tsx
│   │   │   │       └── audit-logs/page.tsx
│   │   │   └── api/
│   │   │       ├── auth/[...nextauth]/route.ts
│   │   │       ├── trpc/[trpc]/route.ts
│   │   │       ├── upload/route.ts
│   │   │       └── files/[id]/route.ts      # serve uploaded files
│   │   ├── components/
│   │   │   ├── ui/                         # shadcn-generated
│   │   │   ├── document-viewer.tsx
│   │   │   ├── summary-card.tsx
│   │   │   ├── checklist-display.tsx
│   │   │   ├── flowchart-renderer.tsx
│   │   │   ├── citation-highlight.tsx
│   │   │   ├── upload-dropzone.tsx
│   │   │   └── role-gate.tsx
│   │   ├── lib/
│   │   │   ├── auth.ts                     # NextAuth config
│   │   │   ├── prisma.ts
│   │   │   ├── ai-client.ts                # HTTP client to ai-pipeline
│   │   │   ├── utils.ts
│   │   │   └── trpc/
│   │   │       ├── client.tsx
│   │   │       ├── server.ts
│   │   │       └── routers/
│   │   │           ├── _app.ts
│   │   │           ├── auth.ts
│   │   │           ├── users.ts
│   │   │           ├── categories.ts
│   │   │           ├── documents.ts
│   │   │           ├── ai.ts
│   │   │           ├── citations.ts
│   │   │           └── auditLogs.ts
│   │   ├── server/
│   │   │   └── trpc.ts                     # tRPC init
│   │   └── tests/
│   │       ├── unit/
│   │       │   ├── auth.test.ts
│   │       │   └── trpc/
│   │       └── e2e/
│   │           ├── login.spec.ts
│   │           └── upload.spec.ts
│   ├── ai-pipeline/                        # FastAPI
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   ├── README.md
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── routers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── parse.py
│   │   │   │   ├── chunk.py
│   │   │   │   ├── summarize.py
│   │   │   │   └── flowchart.py
│   │   │   ├── services/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── ollama_client.py
│   │   │   │   ├── parser_dispatcher.py    # route theo file_type
│   │   │   │   ├── pdf_parser.py
│   │   │   │   ├── docx_parser.py
│   │   │   │   ├── xlsx_parser.py          # openpyxl
│   │   │   │   ├── pptx_parser.py          # python-pptx
│   │   │   │   ├── markdown_parser.py      # md + txt
│   │   │   │   ├── chunker.py
│   │   │   │   ├── summarizer.py
│   │   │   │   └── flowchart_generator.py
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   └── schemas.py              # Pydantic
│   │   │   └── prompts/
│   │   │       ├── summarize_v1.md
│   │   │       └── flowchart_v1.md
│   │   └── tests/
│   │       ├── conftest.py
│   │       ├── test_pdf_parser.py
│   │       ├── test_docx_parser.py
│   │       ├── test_xlsx_parser.py
│   │       ├── test_pptx_parser.py
│   │       ├── test_markdown_parser.py
│   │       ├── test_chunker.py
│   │       ├── test_summarizer.py
│   │       └── test_flowchart_generator.py
│   └── mcp-server/                         # Python MCP
│       ├── pyproject.toml
│       ├── Dockerfile
│       ├── README.md
│       ├── app/
│       │   ├── __init__.py
│       │   ├── server.py
│       │   ├── config.py
│       │   ├── tools/
│       │   │   ├── __init__.py
│       │   │   ├── search_documents.py
│       │   │   ├── get_document.py
│       │   │   ├── list_categories.py
│       │   │   └── get_summary.py
│       │   └── db/
│       │       ├── __init__.py
│       │       └── postgres_client.py
│       └── tests/
│           ├── conftest.py
│           ├── test_search_documents.py
│           ├── test_get_document.py
│           ├── test_list_categories.py
│           └── test_get_summary.py
└── scripts/
    ├── seed.ts                             # seed admin user + sample data
    ├── backup-pg.sh                        # cron backup
    ├── ollama-pull.sh                      # pull qwen2.5:7b first-time
    └── example-mcp-client.py               # demo MCP usage
```

---

## 8. Implementation Phases (7 Plans)

| # | Plan | Effort | Dependencies | Deliverable |
|---|------|--------|--------------|-------------|
| 1 | **Foundation** | 3-4 ngày | None | App Next.js chạy được + login + Postgres Docker + Auth.js |
| 2 | **Document Upload** | 2-3 ngày | Plan 1 | Upload + lưu file + viewer + list page |
| 3 | **AI Pipeline** | 3-4 ngày | Plan 2 | FastAPI + Ollama + parse/chunk/summarize end-to-end |
| 4 | **Flowchart** | 2 ngày | Plan 3 | Generate Mermaid + render client-side |
| 5 | **Citation** | 2-3 ngày | Plan 3 | Citation trong summary + highlight trong viewer |
| 6 | **MCP Server** | 2-3 ngày | Plan 1 | 4 MCP tools + client demo |
| 7 | **Polish + Deploy** | 2-3 ngày | All | HTTPS, backup, monitoring, docs |

**Tổng effort ước tính**: 16-22 ngày làm việc (1 người fulltime).

---

## 9. Memory/Persistence Strategy

### 8.1 `CLAUDE.md` ở root
Project memory, chia sẻ giữa sessions:
- Project overview + tech stack
- Directory structure pointer
- Key decisions kèm lý do
- Commands quan trọng
- Conventions: branch naming, commit format
- Current state (plan đang làm, blockers)

### 8.2 Git workflow
- Mỗi task 1 commit, Conventional Commits format.
- Branch naming: `plan-N-<short-desc>`.
- Mỗi plan là 1 worktree riêng, merge qua PR.

### 8.3 Spec & Plan files
- `docs/superpowers/specs/` — source of truth cho architecture.
- `docs/superpowers/plans/` — chi tiết từng plan với test pass criteria.

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ollama chưa cài | High | Docker image `ollama/ollama`, `scripts/ollama-pull.sh` first-time |
| Model `qwen2.5:7b` nặng ~4.5GB, tốn RAM | High | Document yêu cầu 16GB RAM. Fallback `qwen2.5:3b` cho máy yếu |
| Windows path issue với Docker Postgres volume | Medium | **Named volume** (không bind mount) |
| **Multi-format parsing fail** (PDF scan, XLSX phức tạp, PPTX có ảnh) | High | Fallback chain per file type: pypdf→pdfplumber, openpyxl với try/except từng sheet, python-pptx skip ảnh chỉ lấy text. Hiển thị warning cho user. |
| **File MIME type spoofing** (user rename .exe thành .pdf) | Medium | Validate bằng **magic number** (python-magic), không chỉ check extension |
| **PPTX có nhiều ảnh, ít text** → AI khó tóm tắt | Medium | Trước summarize, check text length. Nếu quá ít (< 200 chars), báo "tài liệu chứa chủ yếu ảnh, không thể tóm tắt". |
| **XLSX có nhiều sheet** → token overflow | Medium | Giới hạn 5 sheet đầu + max 100 rows/sheet. Hiển thị warning nếu cắt bớt. |
| Ollama output JSON không parse được | Medium | Robust parser + regex fallback + retry 1 lần |
| Docker compose không start trên Windows | Medium | Document yêu cầu WSL2 enabled. Test sớm |
| File upload quá tải Next.js body limit | Medium | `bodySizeLimit: '50mb'` trong next.config.ts, dùng busboy stream |
| LLM hallucinate location (citation) | Medium | Validate location polymorphic theo file type (page trong range, sheet tồn tại, slide ≤ total slides) |
| Auth.js v5 còn beta | Low | Pin version cụ thể, monitor release notes |

---

## 11. Verification (end-to-end)

Sau Plan 7, chạy E2E test:

**Scenario multi-format**:
1. Admin login → tạo user `teacher1@school.local`.
2. `teacher1` login → upload **5 file** khác định dạng cùng lúc:
   - PDF "Quy trình điểm danh.pdf" 5 trang.
   - DOCX "Quy chế thi đua.docx".
   - XLSX "Danh sách lớp.xlsx" (3 sheet).
   - PPTX "Hướng dẫn sử dụng.pptx" (10 slides).
   - MD "README-quy-trinh.md".
3. Đợi ~60s → tất cả 5 file đều có summary + checklist + flowchart.
4. PDF: tab "Sơ đồ" render đúng. Summary có citation `[trang 2]`, `[trang 4]` → click → viewer scroll tới page, highlight.
5. PPTX: summary có citation `[slide 3]`, `[slide 7]` → click → viewer nhảy tới slide tương ứng.
6. XLSX: summary có citation `[sheet "Danh sách lớp", hàng 5]` → click → viewer highlight ô.
7. DOCX: render HTML đúng, citation `[đoạn 3]` → highlight.
8. MD: render markdown đúng với heading/list.
9. Chạy `scripts/example-mcp-client.py search "điểm danh"` → trả document.
10. `docker compose down && up` → data còn nguyên (Postgres volume persist).

**Pass criteria**: Toàn bộ 10 bước pass, không có console error, không có file nào bị skip vì lỗi parse.

---

## 12. Open Questions

Không có — đã làm rõ qua 5 câu hỏi Phase 0.

---

## 13. Approval Checklist

Trước khi chuyển sang `writing-plans`:

- [ ] User đã đọc và duyệt design doc này.
- [ ] Không còn câu hỏi open.
- [ ] Stack đã xác nhận.
- [ ] Data model đã review.
- [ ] 7 plans đã chấp nhận thứ tự ưu tiên.
- [ ] Brand identity Rikkei Education đã apply (logo, color palette, typography).

---

## 14. Critical Files cho Implementation

5 file quan trọng nhất để bắt đầu ở Plan 1 (Foundation):

1. `C:\Users\Admin\Desktop\web-noi-bo\docker-compose.yml` — Postgres + Ollama + ai-pipeline + mcp-server.
2. `C:\Users\Admin\Desktop\web-noi-bo\package.json` — npm workspaces root.
3. `C:\Users\Admin\Desktop\web-noi-bo\apps\web\prisma\schema.prisma` — Data model.
4. `C:\Users\Admin\Desktop\web-noi-bo\apps\web\lib\auth.ts` — Auth.js credentials + bcrypt.
5. `C:\Users\Admin\Desktop\web-noi-bo\apps\web\app\globals.css` — **Rikkei Education theme tokens** (CSS variables matching brand).

**Brand assets cần download trước Plan 1**:
- `apps/web/public/rikkei-logo.svg` — Extract từ `https://qlrikkeiedu.web.app/assets/...` hoặc lấy từ Rikkei Education team.
- `apps/web/public/favicon.svg` — Favicon dùng Rikkei logo.

---

## 15. Next Steps

Sau khi user duyệt design doc:

1. `git init` ở root.
2. Tạo `CLAUDE.md` với quick reference (project memory).
3. Tải Rikkei Education logo + áp dụng brand tokens.
4. Bắt đầu Plan 1 với `writing-plans` skill.
5. Tạo worktree branch `plan-1-foundation`.
6. TDD end-to-end cho Plan 1.
5. TDD end-to-end cho Plan 1.
