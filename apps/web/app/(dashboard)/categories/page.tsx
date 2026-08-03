import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CategoryManager } from './category-manager';

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '8px' }}>
        Quản lý danh mục
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        Phân loại tài liệu theo danh mục. Mỗi danh mục có màu riêng để dễ nhận biết.
      </p>
      <CategoryManager isAdmin={session.user.role === 'admin'} />
    </div>
  );
}