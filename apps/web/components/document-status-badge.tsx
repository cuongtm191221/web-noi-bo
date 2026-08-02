type Status = 'draft' | 'published' | 'archived';

const STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string }> = {
  draft: {
    label: 'Bản nháp',
    bg: '#fef3c7',
    color: '#92400e',
  },
  published: {
    label: 'Đã đăng',
    bg: '#dcfce7',
    color: '#166534',
  },
  archived: {
    label: 'Đã lưu trữ',
    bg: '#f3f4f6',
    color: '#374151',
  },
};

export function DocumentStatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      fontSize: '12px',
      fontWeight: 600,
      borderRadius: '9999px',
      backgroundColor: config.bg,
      color: config.color,
    }}>
      {config.label}
    </span>
  );
}
