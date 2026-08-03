import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { UploadButton } from './upload-button';
import { DocumentsClient } from './documents-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { category } = await searchParams;
  const role = session.user.role;
  const canUpload = role === 'admin' || role === 'editor';

  const [documents, categories] = await Promise.all([
    prisma.document.findMany({
      where: category ? { categoryId: category } : undefined,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: { select: { name: true } },
        category: { select: { name: true, color: true } },
      },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedDocs = documents.map((d) => ({
    id: d.id,
    title: d.title,
    format: d.format as 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'md' | 'txt',
    sizeBytes: d.sizeBytes,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    uploader: d.uploader,
    category: d.category,
  }));

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
            Tài liệu
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Danh sách tài liệu quy trình và quy định
          </p>
        </div>
        {canUpload && <UploadButton />}
      </div>

      <DocumentsClient
        documents={serializedDocs}
        categories={categories}
        activeCategoryId={category ?? null}
      />
    </div>
  );
}