# Plan 13: Search Page (Global)

**Date**: 2026-08-04
**Depends on**: Plan 1, Plan 11
**Priority**: P2

## Goal

User search toàn bộ documents qua full-text. Filter theo category, date, format.

## Tasks

### Task 1: Search API

**Files**:
- `apps/web/app/api/search/route.ts`

Postgres full-text search using existing `search_vector` column (if any) or `to_tsquery`.

```typescript
GET /api/search?q=keyword&category=...&format=...&limit=20
Returns: [{ id, title, snippet, category, format, createdAt }]
```

### Task 2: Search page

**Files**:
- `apps/web/app/(dashboard)/search/page.tsx`
- `apps/web/app/(dashboard)/search/search-bar.tsx`
- `apps/web/app/(dashboard)/search/search-results.tsx`
- `apps/web/app/(dashboard)/search/search-filters.tsx`

**Features**:
- Top search bar (debounced 300ms)
- Filter sidebar: category checkboxes, format chips, date range
- Results: title + snippet (highlight matches) + category tag
- Click → document page

### Task 3: Add search_vector column (migration)

```sql
ALTER TABLE documents ADD COLUMN search_vector tsvector;
CREATE INDEX documents_search_idx ON documents USING gin(search_vector);
```

Trigger to auto-update on insert/update.

### Task 4: Highlight matches

In snippet, wrap matches in `<mark>`.

### Task 5: Commit

```bash
git commit -m "feat(search): global search with category filters (Plan 13)"
```

## Self-Review

- Search is fast (<500ms) thanks to GIN index
- Snippet length capped to prevent UI overflow
- Empty state: "Không tìm thấy kết quả"
- URL state: query + filters in URL (shareable)
- Mobile responsive: filters collapse to bottom sheet