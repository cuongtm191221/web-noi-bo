import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BackupManager } from './backup-manager';

export default async function BackupsPage() {
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
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '8px' }}>
        Backup & Restore
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        Tạo backup database + files. Backup được giữ 30 ngày.
      </p>
      <BackupManager />
    </div>
  );
}