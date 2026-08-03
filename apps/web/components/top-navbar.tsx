'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell, User, ChevronDown, Check, LogOut } from 'lucide-react';
import type { Session } from 'next-auth';
import { SignOutButton } from './sign-out-button';

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

function formatTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60_000) return 'vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  return new Date(d).toLocaleDateString('vi-VN');
}

export function TopNavbar({ session }: { session: Session }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false);
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

  return (
    <header style={{
      height: '56px',
      background: 'var(--color-text-dark)',
      boxShadow: '0 2px 4px rgba(30, 41, 59, 0.15)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '16px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      color: 'white',
    }}>
      <div style={{ flex: 1 }} />

      {/* Notifications */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setNotifOpen(!notifOpen); setAccountOpen(false); }}
          aria-label="Thông báo"
          style={{
            position: 'relative',
            padding: '8px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'white',
            display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.22)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
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
        {notifOpen && (
          <div style={{
            position: 'absolute',
            top: '100%', right: 0, marginTop: '8px',
            width: '360px', maxHeight: '480px',
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
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
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

      {/* Account */}
      <div ref={accountRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setAccountOpen(!accountOpen); setNotifOpen(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'white',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.22)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
        >
          <User size={14} />
          {session.user?.name || 'Tài khoản'}
          <ChevronDown size={12} />
        </button>
        {accountOpen && (
          <div style={{
            position: 'absolute',
            top: '100%', right: 0, marginTop: '8px',
            minWidth: '220px',
            backgroundColor: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {session.user?.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {session.user?.email}
              </div>
            </div>
            <Link
              href="/profile"
              onClick={() => setAccountOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px',
                color: 'var(--color-text-dark)',
                textDecoration: 'none',
                fontSize: '13px',
              }}
            >
              <User size={14} />
              Tài khoản
            </Link>
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--color-border)',
            }}>
              <SignOutButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}