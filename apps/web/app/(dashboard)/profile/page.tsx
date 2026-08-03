import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProfileForm } from './profile-form';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '8px' }}>
        Tài khoản của tôi
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        Quản lý thông tin cá nhân và mật khẩu.
      </p>
      <ProfileForm
        name={session.user.name ?? ''}
        email={session.user.email ?? ''}
        role={session.user.role ?? 'viewer'}
      />
    </div>
  );
}