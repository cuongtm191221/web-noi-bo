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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Tài liệu</h1>
          <p className="text-text-muted">Danh sách tài liệu quy trình và quy định</p>
        </div>
        {canUpload && <UploadButton />}
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-text-muted">
          <FileText className="w-12 h-12 mx-auto mb-3 text-border" />
          <p>Chưa có tài liệu nào. Hãy upload tài liệu đầu tiên.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-cream">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Tên</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Danh mục</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Người upload</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Trạng thái</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-text-dark">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const Icon = FORMAT_ICONS[doc.format];
                return (
                  <tr key={doc.id} className="border-t border-border hover:bg-bg-cream transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-3 text-primary hover:underline"
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <div className="font-semibold">{doc.title}</div>
                          <div className="text-xs text-text-muted">
                            {doc.format.toUpperCase()} · {formatBytes(doc.sizeBytes)}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {doc.category?.name ?? <span className="italic">Chưa phân loại</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {doc.uploader.name}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
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
