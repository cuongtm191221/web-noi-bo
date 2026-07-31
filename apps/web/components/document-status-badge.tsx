type Status = 'draft' | 'published' | 'archived';

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  draft: {
    label: 'Bản nháp',
    className: 'bg-yellow-100 text-yellow-800',
  },
  published: {
    label: 'Đã đăng',
    className: 'bg-green-100 text-green-800',
  },
  archived: {
    label: 'Đã lưu trữ',
    className: 'bg-gray-100 text-gray-800',
  },
};

export function DocumentStatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
