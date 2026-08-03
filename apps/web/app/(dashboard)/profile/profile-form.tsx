'use client';

import { useState } from 'react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  editor: 'Giáo viên',
  viewer: 'Người xem',
};

export function ProfileForm({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Lỗi' });
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
    <>
      <div style={{
        backgroundColor: 'white', borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '24px',
        marginBottom: '16px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          Thông tin cá nhân
        </h2>
        <Field label="Họ tên">
          <input value={name} disabled style={{
            ...inputSx, backgroundColor: '#f1f5f9',
          }} />
        </Field>
        <Field label="Email">
          <input value={email} disabled style={{
            ...inputSx, backgroundColor: '#f1f5f9',
          }} />
        </Field>
        <Field label="Vai trò">
          <input value={ROLE_LABELS[role] || role} disabled style={{
            ...inputSx, backgroundColor: '#f1f5f9',
          }} />
        </Field>
        <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Liên hệ admin nếu bạn cần thay đổi thông tin này.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'white', borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '24px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          Đổi mật khẩu
        </h2>

        {message && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
            borderRadius: '6px',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            fontSize: '14px',
            marginBottom: '16px',
          }}>
            {message.text}
          </div>
        )}

        <Field label="Mật khẩu hiện tại">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={inputSx}
            required
            autoComplete="current-password"
          />
        </Field>
        <Field label="Mật khẩu mới (tối thiểu 8 ký tự)">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputSx}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Xác nhận mật khẩu mới">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputSx}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '8px 16px', backgroundColor: 'var(--color-primary)',
              color: 'white', border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </>
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