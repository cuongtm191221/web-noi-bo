# Plan 12: Profile + Change Password

**Date**: 2026-08-04
**Depends on**: Plan 9
**Priority**: P2

## Goal

User đổi password + xem MCP tokens cá nhân.

## Tasks

### Task 1: Profile page

**Files**:
- `apps/web/app/(dashboard)/profile/page.tsx`

Sections:
- Thông tin cá nhân (name, email) — read-only
- Đổi mật khẩu (form)
- MCP Tokens của tôi (list + create button)

### Task 2: Change password API

**Files**:
- `apps/web/app/api/auth/change-password/route.ts`

```typescript
POST /api/auth/change-password
Body: { currentPassword, newPassword }
Returns: { success: true } | 401
```

Verify current password (bcrypt), then hash new + update.

### Task 3: Sidebar

Add user avatar dropdown:
- Profile
- Settings/Integrations
- Logout

### Task 4: Commit

```bash
git commit -m "feat(profile): user profile + change password + MCP tokens view (Plan 12)"
```

## Self-Review

- Password strength validation (min 8 chars, mixed case + number)
- Current password verified before change
- Logout returns to login page
- User can see their tokens but not others