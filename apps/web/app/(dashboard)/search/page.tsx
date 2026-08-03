import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SearchForm } from './search-form';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; format?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { q = '', category = '', format = '' } = await searchParams;

  const categories = await prisma.category.findMany({
    select: { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-dark)', marginBottom: '8px' }}>
        Tìm kiếm tài liệu
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        Tìm trong tiêu đề, mô tả và tên file.
      </p>
      <SearchForm
        initialQ={q}
        initialCategory={category}
        initialFormat={format}
        categories={categories}
      />
    </div>
  );
}