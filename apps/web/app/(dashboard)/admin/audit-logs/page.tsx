import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ActivityFeed } from './activity-feed';

export default async function AuditLogsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const isAdmin = session.user.role === 'admin';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '8px' }}>
        Audit log
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        {isAdmin
          ? 'Theo dõi toàn bộ hoạt động: upload, edit, delete, đổi role, tạo token.'
          : 'Lịch sử hoạt động của bạn trên hệ thống.'}
      </p>
      <ActivityFeed isAdmin={isAdmin} />
    </div>
  );
}