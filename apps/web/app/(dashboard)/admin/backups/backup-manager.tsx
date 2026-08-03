'use client';

import { useEffect, useState } from 'react';
import { Database, FolderArchive, RefreshCw, Download, CheckCircle2, XCircle } from 'lucide-react';

type Backup = {
  name: string;
  timestamp: string;
  hasPostgres: boolean;
  hasUploads: boolean;
  postgresSize?: number;
  uploadsSize?: number;
  metadata?: { timestamp?: string; date?: string; name?: string; retentionDays?: number };
};

function formatBytes(b?: number): string {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTimestamp(ts: string): string {
  if (!ts || ts.length < 14) return ts;
  const clean = ts.replace('_', '');
  const y = clean.slice(0, 4);
  const m = clean.slice(4, 6);
  const d = clean.slice(6, 8);
  const hh = clean.slice(8, 10);
  const mm = clean.slice(10, 12);
  const ss = clean.slice(12, 14);
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

export function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backups');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBackups(data.backups);
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
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      if (!res.ok) throw new Error(await res.text());
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await load();
        if (attempts >= 15) clearInterval(poll);
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const download = (name: string) => {
    window.location.href = `/api/admin/backups/download/${name}`;
  };

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
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          {backups.length} backup
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', backgroundColor: 'var(--color-primary)',
            color: 'white', border: 'none', borderRadius: '6px',
            fontSize: '14px', fontWeight: 500,
            cursor: creating ? 'not-allowed' : 'pointer',
            opacity: creating ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} />
          {creating ? 'Đang tạo...' : 'Tạo backup ngay'}
        </button>
      </div>

      <div style={{
        backgroundColor: 'white', borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Đang tải...
          </div>
        ) : backups.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Chưa có backup nào. Bấm "Tạo backup ngay" để bắt đầu.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-bg-cream)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Ngày tạo</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Postgres</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Uploads</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Tải về</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => {
                const isComplete = b.hasPostgres;
                return (
                  <tr key={b.name} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {formatTimestamp(b.timestamp)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isComplete ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '2px 10px',
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          <CheckCircle2 size={12} />
                          Thành công
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '2px 10px',
                          backgroundColor: '#fef2f2',
                          color: '#991b1b',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}>
                          <XCircle size={12} />
                          Lỗi
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {b.hasPostgres ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          fontSize: '13px',
                        }}>
                          <Database size={14} style={{ color: '#005c9e' }} />
                          {formatBytes(b.postgresSize)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {b.hasUploads ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          fontSize: '13px',
                        }}>
                          <FolderArchive size={14} style={{ color: '#009f4d' }} />
                          {formatBytes(b.uploadsSize)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        {b.hasPostgres && (
                          <button
                            onClick={() => download(`${b.name}_postgres.json.gz`)}
                            title="Tải postgres backup"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px',
                              backgroundColor: 'transparent',
                              color: 'var(--color-primary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={12} />
                            DB
                          </button>
                        )}
                        {b.hasUploads && (
                          <button
                            onClick={() => download(`${b.name}_uploads.tar.gz`)}
                            title="Tải uploads backup"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px',
                              backgroundColor: 'transparent',
                              color: 'var(--color-primary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={12} />
                            Files
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}