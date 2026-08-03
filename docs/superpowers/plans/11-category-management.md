# Plan 11: Category Management

**Date**: 2026-08-04
**Depends on**: Plan 1, Plan 10
**Priority**: P1

## Goal

Admin/Teacher CRUD categories để phân loại documents. Color tags cho visual.

## Tasks

### Task 1: Verify Category model

Category table đã có trong Prisma schema (Plan 2). Verify + add color/slug.

```prisma
model Category {
  id        String   @id @default(cuid())
  name      String   @unique
  slug      String   @unique
  color     String   @default("#005c9e") // hex color
  icon      String?  // optional lucide icon name
  createdAt DateTime @default(now())
  documents Document[]
}
```

### Task 2: tRPC router

**Files**:
- `apps/web/lib/trpc/routers/categories.ts`

```typescript
list()
create({ name, color, icon? })
update({ id, ... })
delete({ id })  // Check no docs attached, else error
```

### Task 3: Page

**Files**:
- `apps/web/app/(dashboard)/categories/page.tsx`
- `apps/web/app/(dashboard)/categories/category-list.tsx`
- `apps/web/app/(dashboard)/categories/category-form-modal.tsx`

**Features**:
- Grid view: cards with color stripe, name, doc count
- Search
- Click → edit modal
- Delete (confirm if docs attached)

### Task 4: Document upload form update

Update upload form to show category selector with colors.

### Task 5: Commit

```bash
git commit -m "feat(categories): category CRUD page with color tags (Plan 11)"
```

## Self-Review

- Cannot delete category with documents (or reassign first)
- Color picker limited to brand palette
- Slug auto-generated from name
- Sort by name or createdAt