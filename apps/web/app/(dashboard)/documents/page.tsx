import Link from 'next/link';
import { FileText, FileSpreadsheet, FileType, Presentation, FileCode } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { UploadButton } from './upload-button';
import { DocumentStatusBadge } from '@/components/document-status-badge';
import { formatBytes } from '@/lib/format';

const FORMAT_ICONS = {
  pdf: FileText,
  docx: FileType,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
  md: FileCode,
  txt: FileText,
} as const;

export default async function DocumentsPage() {
  const session = await auth();
  const documents = await prisma.document.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      uploader: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const canUpload = session?.user.role === 'admin' || session?.user.role === 'editor';

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '8px' }}>
            Tài liệu
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Danh sách tài liệu quy trình và quy định
          </p>
        </div>
        {canUpload && <UploadButton />}
      </div>

      {documents.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <FileText style={{ width: '48px', height: '48px', margin: '0 auto 12px', color: 'var(--color-border)' }} />
          <p>Chưa có tài liệu nào. Hãy upload tài liệu đầu tiên.</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: 'var(--color-bg-cream)' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-dark)' }}>Tên</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-dark)' }}>Danh mục</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-dark)' }}>Người upload</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-dark)' }}>Trạng thái</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-dark)' }}>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, idx) => {
                const Icon = FORMAT_ICONS[doc.format];
                return (
                  <tr key={doc.id} style={{
                    borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
                  }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/documents/${doc.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                        }}
                      >
                        <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{doc.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {doc.format.toUpperCase()} · {formatBytes(doc.sizeBytes)}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      {doc.category?.name ?? <em>Chưa phân loại</em>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      {doc.uploader.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      {doc.createdAt.toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
