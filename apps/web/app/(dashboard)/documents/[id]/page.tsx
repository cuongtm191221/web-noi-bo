import Link from 'next/link';
import { ChevronLeft, Download } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DocumentStatusBadge } from '@/components/document-status-badge';

export default async function DocumentViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      uploader: { select: { name: true, email: true } },
      category: true,
    },
  });

  if (!doc) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/documents"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '14px',
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
          marginBottom: '16px',
        }}
      >
        <ChevronLeft style={{ width: '16px', height: '16px' }} />
        Quay lại danh sách
      </Link>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
              {doc.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
              <span>{doc.format.toUpperCase()}</span>
              <span>·</span>
              <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
              <span>·</span>
              <span>Upload bởi {doc.uploader.name}</span>
              <span>·</span>
              <span>{doc.createdAt.toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
          <DocumentStatusBadge status={doc.status} />
        </div>

        {doc.category && (
          <div style={{ fontSize: '14px' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Danh mục: </span>
            <span style={{ fontWeight: 600 }}>{doc.category.name}</span>
          </div>
        )}
      </div>

      {/* Tabs placeholder */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '4px',
        marginBottom: '24px',
        display: 'inline-flex',
        gap: '4px',
      }}>
        <button style={{
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 600,
          borderRadius: '6px',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}>
          Tài liệu
        </button>
        <button
          disabled
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '6px',
            color: 'var(--color-text-muted)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'not-allowed',
          }}
          title="Sẽ có ở Plan 3"
        >
          Tóm tắt
        </button>
        <button
          disabled
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '6px',
            color: 'var(--color-text-muted)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'not-allowed',
          }}
          title="Sẽ có ở Plan 4"
        >
          Sơ đồ
        </button>
        <button
          disabled
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '6px',
            color: 'var(--color-text-muted)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'not-allowed',
          }}
          title="Sẽ có ở Plan 5"
        >
          Trích dẫn
        </button>
      </div>

      {/* Viewer placeholder */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        <Download style={{ width: '48px', height: '48px', margin: '0 auto 12px', color: 'var(--color-border)' }} />
        <p style={{ marginBottom: '16px' }}>
          Viewer cho {doc.format.toUpperCase()} sẽ được implement ở Plan tiếp theo.
        </p>
        <a
          href={`/api/documents/${doc.id}/download`}
          style={{
            color: 'var(--color-rikkei-blue)',
            fontSize: '14px',
          }}
        >
          Tải file về máy
        </a>
      </div>
    </div>
  );
}
