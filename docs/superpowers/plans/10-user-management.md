# Plan 10: User Management

**Date**: 2026-08-04
**Depends on**: Plan 1, Plan 9
**Priority**: P1

## Goal

Admin CRUD user accounts: tạo teacher accounts, deactivate users, đổi role.

## User Flow

1. Admin login → sidebar → "Quản lý người dùng"
2. Table: name, email, role, status, createdAt, lastLogin
3. Actions: Tạo mới, Sửa, Vô hiệu hóa, Reset password

## Tasks

### Task 1: Page structure

**Files**:
- Create: `apps/web/app/(dashboard)/users/page.tsx`
- Create: `apps/web/app/(dashboard)/users/user-table.tsx`
- Create: `apps/web/app/(dashboard)/users/user-form-modal.tsx`

### Task 2: tRPC router

**Files**:
- Create: `apps/web/lib/trpc/routers/users.ts`

```typescript
// Procedures:
list()        // Admin only - paginated list
create({ email, name, password, role })
update({ id, ... }) 
deactivate({ id })
resetPassword({ id, newPassword })
```

Authorization check via middleware.

### Task 3: UI components

**UserTable**:
- Columns: Avatar, Name, Email, Role badge, Status, Created, Last login
- Search + filter by role
- Pagination

**UserFormModal**:
- Create form: email, name, password, role select
- Edit form: email (disabled), name, role
- Validation: email format, password strength

### Task 4: Seed data updates

Add 3 sample teachers to existing seed for testing.

### Task 5: Sidebar link

Add "Quản lý người dùng" link (admin only).

### Task 6: Commit

```bash
git commit -m "feat(users): admin CRUD user management page (Plan 10)"
```

## Self-Review

- Admin-only access (middleware)
- Soft delete via `deactivatedAt` field (preserve audit trail)
- Password reset: temporary password, force change on next login (future)
- Role: enum ADMIN | TEACHER
- No user can delete themselves (prevent lockout)