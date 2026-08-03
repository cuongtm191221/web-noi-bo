'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_COLORS: Record<string, string> = {
  UPLOAD_DONE: '#009f4d',
  AI_DONE: '#005c9e',
  AI_FAILED: '#dc2626',
  DOC_DELETED: '#dc2626',
  USER_CREATED: '#009f4d',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markRead = async (id: string | 'all') => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60_000) return 'vừa xong';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
    return new Date(d).toLocaleDateString('vi-VN');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          padding: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-dark)',
        }}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px', right: '4px',
            backgroundColor: '#dc2626',
            color: 'white',
            borderRadius: '50%',
            minWidth: '16px', height: '16px',
            fontSize: '10px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed',
          top: '64px', left: '12px',
          width: '320px', maxHeight: '480px',
          backgroundColor: 'white',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Thông báo</span>
            {unread > 0 && (
              <button
                onClick={() => markRead('all')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <Check size={12} />
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                color: 'var(--color-text-muted)', fontSize: '13px',
              }}>
                Chưa có thông báo nào.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: n.read ? 'white' : '#f0f4ff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      backgroundColor: TYPE_COLORS[n.type] || '#6b7280',
                      marginTop: '8px', flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px', fontWeight: n.read ? 500 : 600,
                        marginBottom: '2px',
                      }}>
                        {n.title}
                      </div>
                      <div style={{
                        fontSize: '12px', color: 'var(--color-text-muted)',
                        lineHeight: 1.4,
                      }}>
                        {n.message}
                      </div>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginTop: '4px', alignItems: 'center',
                      }}>
                        <span style={{
                          fontSize: '11px', color: 'var(--color-text-muted)',
                        }}>
                          {formatTime(n.createdAt)}
                        </span>
                        {n.link && (
                          <Link
                            href={n.link}
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-primary)',
                              textDecoration: 'none',
                            }}
                          >
                            Xem →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}