import { FileText } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-2">Tài liệu</h1>
      <p className="text-text-muted mb-6">Danh sách tài liệu quy trình và quy định</p>

      <div className="bg-white rounded-lg shadow-sm p-8 text-center text-text-muted">
        <FileText className="w-12 h-12 mx-auto mb-3 text-border" />
        <p>Chưa có tài liệu nào. Upload tính năng sẽ có ở Plan 2.</p>
      </div>
    </div>
  );
}
