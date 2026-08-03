import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserManagement } from './user-management';

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '8px' }}>
        Quản lý người dùng
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        Tạo, sửa, vô hiệu hóa tài khoản giáo viên và quản trị viên.
      </p>
      <UserManagement currentUserId={session.user.id} />
    </div>
  );
}