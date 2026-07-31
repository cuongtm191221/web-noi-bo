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
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Quay lại danh sách
      </Link>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">{doc.title}</h1>
            <div className="flex items-center gap-3 text-sm text-text-muted">
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
          <div className="text-sm">
            <span className="text-text-muted">Danh mục: </span>
            <span className="font-semibold">{doc.category.name}</span>
          </div>
        )}
      </div>

      {/* Tabs placeholder */}
      <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex gap-1">
        <button className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-white">
          Tài liệu
        </button>
        <button
          disabled
          className="px-4 py-2 text-sm font-semibold rounded-md text-text-muted cursor-not-allowed"
          title="Sẽ có ở Plan 3"
        >
          Tóm tắt
        </button>
        <button
          disabled
          className="px-4 py-2 text-sm font-semibold rounded-md text-text-muted cursor-not-allowed"
          title="Sẽ có ở Plan 4"
        >
          Sơ đồ
        </button>
        <button
          disabled
          className="px-4 py-2 text-sm font-semibold rounded-md text-text-muted cursor-not-allowed"
          title="Sẽ có ở Plan 5"
        >
          Trích dẫn
        </button>
      </div>

      {/* Viewer placeholder */}
      <div className="bg-white rounded-lg shadow-sm p-8 text-center text-text-muted">
        <Download className="w-12 h-12 mx-auto mb-3 text-border" />
        <p className="mb-4">
          Viewer cho {doc.format.toUpperCase()} sẽ được implement ở Plan tiếp theo.
        </p>
        <a
          href={`/api/documents/${doc.id}/download`}
          className="text-rikkei-blue hover:underline text-sm"
        >
          Tải file về máy
        </a>
      </div>
    </div>
  );
}
