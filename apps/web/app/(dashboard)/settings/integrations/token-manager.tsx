'use client';

import { useEffect, useState } from 'react';

type Token = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type CreatedToken = {
  token: { id: string; name: string; createdAt: string };
  plain: string;
};

export function TokenManager() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [created, setCreated] = useState<CreatedToken | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp/tokens');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTokens(data.tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setError(null);
    try {
      const res = await fetch('/api/mcp/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCreated(data);
      setNewName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Thu hồi token này? Agent sẽ không thể kết nối nữa.')) return;
    try {
      const res = await fetch(`/api/mcp/tokens/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#991b1b',
          fontSize: '14px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Create new token form */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>
          Tạo token mới
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Tên token (vd: Claude Desktop, VPS Agent)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            maxLength={100}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              opacity: creating || !newName.trim() ? 0.6 : 1,
            }}
          >
            Tạo
          </button>
        </div>
      </div>

      {/* Created token modal */}
      {created && (
        <CreatedTokenModal created={created} onClose={() => setCreated(null)} />
      )}

      {/* Token list */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '20px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          Token hiện có ({tokens.length})
        </h2>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Đang tải...
          </div>
        ) : tokens.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Chưa có token nào. Tạo token đầu tiên ở trên.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Tên</th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Prefix</th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Tạo lúc</th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Dùng lần cuối</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {t.tokenPrefix}...
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>
                    {formatDate(t.createdAt)}
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>
                    {t.lastUsedAt ? formatDate(t.lastUsedAt) : '—'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(t.id)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'transparent',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Thu hồi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CreatedTokenModal({
  created,
  onClose,
}: {
  created: CreatedToken;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Get the MCP endpoint URL - use current host
  const mcpUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/api/mcp`
    : 'https://your-domain.com/api/mcp';

  // Generate Claude Desktop config - HTTP type (MCP native support)
  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        'rikkei-docs': {
          type: 'http',
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${created.plain}`,
          },
        },
      },
    },
    null,
    2,
  );

  const copyToken = () => {
    navigator.clipboard.writeText(created.plain);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 100,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600 }}>
          Token đã tạo
        </h2>
        <p style={{
          color: '#dc2626',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '16px',
        }}>
          ⚠ Lưu token này ngay. Bạn sẽ không thể xem lại sau khi đóng hộp thoại này.
        </p>

        {/* Token value */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          marginBottom: '20px',
          fontFamily: 'monospace',
          fontSize: '12px',
          wordBreak: 'break-all',
        }}>
          <span style={{ flex: 1 }}>{created.plain}</span>
          <button
            onClick={copyToken}
            style={{
              padding: '4px 8px',
              backgroundColor: copiedToken ? '#009f4d' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {copiedToken ? 'Đã copy!' : 'Copy'}
          </button>
        </div>

        {/* Claude Desktop Config */}
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
          💻 Cấu hình Claude Desktop
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>
          Thêm config sau vào Claude Desktop settings (<code>~/.claude/settings.json</code>):
        </p>
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '6px',
          marginBottom: '16px',
          overflow: 'hidden',
        }}>
          <pre style={{
            color: '#e2e8f0',
            padding: '12px',
            fontSize: '11px',
            overflowX: 'auto',
            margin: 0,
          }}>
            {mcpConfig}
          </pre>
        </div>

        <button
          onClick={copyConfig}
          style={{
            padding: '8px 16px',
            backgroundColor: copied ? '#009f4d' : 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          {copied ? 'Đã copy config!' : 'Copy Config'}
        </button>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: 'var(--text-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Đã lưu, đóng
          </button>
        </div>
      </div>
    </div>
  );
}
