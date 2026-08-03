'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Edit3, Trash2, Tag, KeyRound, UserPlus, UserMinus, LogIn, Key, UserCheck, Eye } from 'lucide-react';

type Activity = {
  id: string;
  user: { name: string; email: string; role: string };
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string }> = {
  UPLOAD: { label: 'Upload tài liệu', icon: FileText, color: '#005c9e' },
  EDIT: { label: 'Sửa tài liệu', icon: Edit3, color: '#0d226b' },
  DELETE: { label: 'Xóa tài liệu', icon: Trash2, color: '#dc2626' },
  TOKEN_CREATE: { label: 'Tạo MCP token', icon: KeyRound, color: '#009f4d' },
  TOKEN_REVOKE: { label: 'Thu hồi MCP token', icon: Key, color: '#dc2626' },
  USER_CREATE: { label: 'Tạo user', icon: UserPlus, color: '#009f4d' },
  USER_UPDATE: { label: 'Cập nhật user', icon: UserCheck, color: '#005c9e' },
  USER_DEACTIVATE: { label: 'Vô hiệu hóa user', icon: UserMinus, color: '#dc2626' },
  USER_REACTIVATE: { label: 'Kích hoạt user', icon: UserCheck, color: '#009f4d' },
  PASSWORD_RESET: { label: 'Đổi mật khẩu', icon: Key, color: '#005c9e' },
  VIEW: { label: 'Xem tài liệu', icon: Eye, color: '#6b7280' },
};

export function ActivityFeed({ isAdmin }: { isAdmin: boolean }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      const res = await fetch(`/api/activities?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActivities(data.activities);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, actionFilter, entityFilter]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div style={{
        backgroundColor: 'white', padding: '16px 20px',
        borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Lọc:</span>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
          style={{
            padding: '6px 12px', border: '1px solid var(--color-border)',
            borderRadius: '6px', fontSize: '13px',
          }}
        >
          <option value="">Tất cả hành động</option>
          {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        {isAdmin && (
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setOffset(0); }}
            style={{
              padding: '6px 12px', border: '1px solid var(--color-border)',
              borderRadius: '6px', fontSize: '13px',
            }}
          >
            <option value="">Tất cả đối tượng</option>
            <option value="document">Document</option>
            <option value="user">User</option>
            <option value="token">Token</option>
          </select>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Tổng: {total} bản ghi
        </span>
      </div>

      <div style={{
        backgroundColor: 'white', borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Đang tải...
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Chưa có hoạt động nào.
          </div>
        ) : (
          <div>
            {activities.map((a, idx) => {
              const cfg = ACTION_CONFIG[a.action] || { label: a.action, icon: Tag, color: '#6b7280' };
              const Icon = cfg.icon;
              const link = a.entityType === 'document' && a.entityId
                ? `/documents/${a.entityId}`
                : null;
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', gap: '12px',
                    padding: '12px 20px',
                    borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: `${cfg.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px' }}>
                      <strong>{a.user.name}</strong>{' '}
                      <span style={{ color: 'var(--color-text-muted)' }}>{cfg.label.toLowerCase()}</span>
                      {link && (
                        <>
                          {' '}
                          <Link
                            href={link}
                            style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                          >
                            xem
                          </Link>
                        </>
                      )}
                    </div>
                    {a.metadata && Object.keys(a.metadata).length > 0 && (
                      <div style={{
                        fontSize: '12px', color: 'var(--color-text-muted)',
                        marginTop: '2px',
                      }}>
                        {Object.entries(a.metadata).slice(0, 3).map(([k, v]) => (
                          <span key={k} style={{ marginRight: '8px' }}>
                            {k}: <code style={{ backgroundColor: '#f1f5f9', padding: '0 4px', borderRadius: '3px' }}>
                              {typeof v === 'string' ? v : JSON.stringify(v)}
                            </code>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '12px', color: 'var(--color-text-muted)',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {formatDate(a.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginTop: '16px', fontSize: '13px',
          color: 'var(--color-text-muted)',
        }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            style={{
              padding: '6px 12px', border: '1px solid var(--color-border)',
              borderRadius: '4px', backgroundColor: 'white',
              cursor: offset === 0 ? 'not-allowed' : 'pointer',
              opacity: offset === 0 ? 0.5 : 1,
            }}
          >
            ← Trước
          </button>
          <span>Trang {currentPage} / {totalPages}</span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={currentPage >= totalPages}
            style={{
              padding: '6px 12px', border: '1px solid var(--color-border)',
              borderRadius: '4px', backgroundColor: 'white',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage >= totalPages ? 0.5 : 1,
            }}
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}