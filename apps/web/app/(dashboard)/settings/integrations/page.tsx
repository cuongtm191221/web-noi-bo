import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TokenManager } from './token-manager';

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '8px' }}>
        Tích hợp & API
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        Tạo MCP token để kết nối với Claude Desktop, Cursor, hoặc các AI agents khác.
        Mỗi token cho phép agent truy vấn tài liệu của bạn qua MCP server.
      </p>

      <TokenManager />
    </div>
  );
}