# Plan 14: Activity Log

**Date**: 2026-08-04
**Depends on**: Plan 1, Plan 10
**Priority**: P2

## Goal

Audit trail: ai làm gì với document (upload, edit, delete, view).

## Tasks

### Task 1: Activity table

```prisma
model Activity {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  action     String   // UPLOAD, VIEW, UPDATE, DELETE, LOGIN, TOKEN_CREATE, etc.
  entityType String?  // document, user, category, token
  entityId   String?
  metadata   Json?    // { filename: "...", format: "pdf" }
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
  @@index([entityType, entityId])
  @@map("activities")
}
```

### Task 2: Logging hooks

Add activity logging to:
- Document upload (UPLOAD)
- Document view (VIEW) — sampled, not every request
- Document delete (DELETE)
- Login (LOGIN)
- Token create/revoke (TOKEN_CREATE, TOKEN_REVOKE)
- User create/deactivate (USER_CREATE, USER_DEACTIVATE)

### Task 3: Activity page

**Files**:
- `apps/web/app/(dashboard)/activity/page.tsx`

**Features**:
- Timeline view (newest first)
- Filter: user, action type, entity type, date range
- Admin sees all; teacher sees own
- Export CSV

### Task 4: Commit

```bash
git commit -m "feat(activity): audit log for documents and user actions (Plan 14)"
```

## Self-Review

- VIEW events sampled (1 in 10) to avoid DB bloat
- Retention policy: keep 90 days, archive older
- IP + user agent for security audit
- Metadata is JSON for flexibility (per-entity custom fields)