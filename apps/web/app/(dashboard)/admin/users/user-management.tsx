'use client';

import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
  deactivatedAt: string | null;
};

export function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  const limit = 20;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set('q', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const handleDeactivate = async (u: User) => {
    if (u.id === currentUserId) return;
    if (!confirm(`Vô hiệu hóa tài khoản "${u.name}"?`)) return;
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivatedAt: 'now' }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleReactivate = async (u: User) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deactivatedAt: null }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleResetPassword = async (u: User) => {
    if (!confirm(`Reset mật khẩu cho "${u.name}"?`)) return;
    try {
      const res = await fetch(`/api/users/${u.id}/reset-password`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      prompt(
        `Mật khẩu tạm cho ${u.email}:\n\n${data.tempPassword}\n\nHãy gửi cho user và yêu cầu đổi ngay.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {error && (
        <div style={{
          padding: '12px 16px', backgroundColor: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: '6px',
          color: '#991b1b', fontSize: '14px', marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      <div style={{
        backgroundColor: 'white', borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '20px',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '16px',
          alignItems: 'center', flexWrap: 'wrap',
        }}>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            style={{
              flex: 1, minWidth: '200px', padding: '8px 12px',
              border: '1px solid var(--color-border)', borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px', border: '1px solid var(--color-border)',
              borderRadius: '6px', fontSize: '14px',
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px', border: '1px solid var(--color-border)',
              borderRadius: '6px', fontSize: '14px',
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã vô hiệu</option>
          </select>
          <button
            onClick={() => setCreating(true)}
            style={{
              padding: '8px 16px', backgroundColor: 'var(--color-primary)',
              color: 'white', border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            + Tạo user
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Đang tải...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Không có user nào.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Họ tên</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Vai trò</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Ngày tạo</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>
                    {u.name}
                    {u.id === currentUserId && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        (bạn)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--color-text-muted)' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {u.deactivatedAt ? (
                      <span style={{ color: '#dc2626', fontSize: '12px' }}>Vô hiệu</span>
                    ) : (
                      <span style={{ color: '#009f4d', fontSize: '12px' }}>Hoạt động</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--color-text-muted)' }}>
                    {formatDate(u.createdAt)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => setEditing(u)}
                      style={{
                        padding: '4px 10px', backgroundColor: 'transparent',
                        color: 'var(--color-primary)', border: '1px solid var(--color-border)',
                        borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
                        marginRight: '4px',
                      }}
                    >
                      Sửa
                    </button>
                    {u.deactivatedAt ? (
                      <button
                        onClick={() => handleReactivate(u)}
                        style={{
                          padding: '4px 10px', backgroundColor: 'transparent',
                          color: '#009f4d', border: '1px solid #009f4d',
                          borderRadius: '4px', fontSize: '13px', cursor: 'pointer',
                        }}
                      >
                        Kích hoạt
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleResetPassword(u)}
                          disabled={u.id === currentUserId}
                          style={{
                            padding: '4px 10px', backgroundColor: 'transparent',
                            color: '#005c9e', border: '1px solid #005c9e',
                            borderRadius: '4px', fontSize: '13px',
                            cursor: u.id === currentUserId ? 'not-allowed' : 'pointer',
                            opacity: u.id === currentUserId ? 0.5 : 1,
                            marginRight: '4px',
                          }}
                        >
                          Reset pwd
                        </button>
                        <button
                          onClick={() => handleDeactivate(u)}
                          disabled={u.id === currentUserId}
                          style={{
                            padding: '4px 10px', backgroundColor: 'transparent',
                            color: '#dc2626', border: '1px solid #fecaca',
                            borderRadius: '4px', fontSize: '13px',
                            cursor: u.id === currentUserId ? 'not-allowed' : 'pointer',
                            opacity: u.id === currentUserId ? 0.5 : 1,
                          }}
                        >
                          Vô hiệu
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: '16px', fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}>
            <span>Tổng {total} user{' '}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px', border: '1px solid var(--color-border)',
                  borderRadius: '4px', backgroundColor: 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                ← Trước
              </button>
              <span style={{ padding: '6px 12px' }}>
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px', border: '1px solid var(--color-border)',
                  borderRadius: '4px', backgroundColor: 'white',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1,
                }}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: 'admin' | 'editor' | 'viewer' }) {
  const colors: Record<'admin' | 'editor' | 'viewer', { bg: string; label: string }> = {
    admin: { bg: '#0d226b', label: 'Admin' },
    editor: { bg: '#005c9e', label: 'Editor' },
    viewer: { bg: '#6b7280', label: 'Viewer' },
  };
  const c = colors[role];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px',
      backgroundColor: c.bg, color: 'white',
      borderRadius: '4px', fontSize: '11px', fontWeight: 600,
    }}>
      {c.label}
    </span>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role }),
      });
      if (!res.ok) throw new Error(await res.text());
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Sửa user" onClose={onClose}>
      {error && <ModalError msg={error} />}
      <Field label="Email">
        <input value={user.email} disabled style={{
          width: '100%', padding: '8px 12px',
          border: '1px solid var(--color-border)', borderRadius: '6px',
          fontSize: '14px', backgroundColor: '#f1f5f9',
        }} />
      </Field>
      <Field label="Họ tên">
        <input value={name} onChange={(e) => setName(e.target.value)} style={{
          width: '100%', padding: '8px 12px',
          border: '1px solid var(--color-border)', borderRadius: '6px',
          fontSize: '14px',
        }} />
      </Field>
      <Field label="Vai trò">
        <select value={role} onChange={(e) => setRole(e.target.value as User['role'])} style={{
          width: '100%', padding: '8px 12px',
          border: '1px solid var(--color-border)', borderRadius: '6px',
          fontSize: '14px',
        }}>
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      </Field>
      <ModalActions onClose={onClose} onSave={handleSave} saving={saving} />
    </Modal>
  );
}

function CreateUserModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('viewer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role }),
      });
      if (!res.ok) throw new Error(await res.text());
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const inputSx: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    border: '1px solid var(--color-border)', borderRadius: '6px',
    fontSize: '14px',
  };

  return (
    <Modal title="Tạo user mới" onClose={onClose}>
      {error && <ModalError msg={error} />}
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teacher@rikkei.edu.vn"
          style={inputSx}
        />
      </Field>
      <Field label="Họ tên">
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputSx} />
      </Field>
      <Field label="Mật khẩu (tối thiểu 8 ký tự)">
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputSx}
        />
      </Field>
      <Field label="Vai trò">
        <select value={role} onChange={(e) => setRole(e.target.value as User['role'])} style={inputSx}>
          <option value="admin">Admin</option>
          <option value="editor">Editor (giáo viên)</option>
          <option value="viewer">Viewer (chỉ xem)</option>
        </select>
      </Field>
      <ModalActions onClose={onClose} onSave={handleCreate} saving={saving} />
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 100,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        maxWidth: '500px', width: '100%', padding: '24px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ModalError({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '10px 12px', backgroundColor: '#fef2f2',
      border: '1px solid #fecaca', borderRadius: '6px',
      color: '#991b1b', fontSize: '13px', marginBottom: '12px',
    }}>
      {msg}
    </div>
  );
}

function ModalActions({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
      <button
        onClick={onClose}
        style={{
          padding: '8px 16px', backgroundColor: 'transparent',
          color: 'var(--color-text-dark)', border: '1px solid var(--color-border)',
          borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
        }}
      >
        Hủy
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          padding: '8px 16px', backgroundColor: 'var(--color-primary)',
          color: 'white', border: 'none', borderRadius: '6px',
          fontSize: '14px', fontWeight: 500,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Đang lưu...' : 'Lưu'}
      </button>
    </div>
  );
}