'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  documentId: string;
  onUpdated: () => void;
  onDeleted: () => void;
};

export function EditDocumentModal({ documentId, onUpdated, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState<{
    title: string;
    description: string | null;
    categoryId: string | null;
  } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/documents/${documentId}/meta`).then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ])
      .then(([meta, cats]) => {
        setDoc(meta);
        setTitle(meta.title || '');
        setDescription(meta.description || '');
        setCategoryId(meta.categoryId || '');
        setCategories(cats.categories || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, documentId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOpen(false);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Xóa tài liệu này? Hành động không thể hoàn tác.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setDeleting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Sửa tài liệu"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'transparent',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        <Pencil size={14} />
        Sửa
      </button>
    );
  }

  if (!doc) {
    return (
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px' }}>
          {loading ? 'Đang tải...' : error}
        </div>
      </div>
    );
  }

  const inputSx: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    border: '1px solid var(--color-border)', borderRadius: '6px',
    fontSize: '14px',
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Sửa tài liệu
          </h2>
          <button
            onClick={() => setOpen(false)}
            style={{
              padding: '4px', backgroundColor: 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px 12px', backgroundColor: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: '6px',
            color: '#991b1b', fontSize: '13px', marginBottom: '12px',
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
            Tiêu đề
          </label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputSx} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
            Mô tả
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputSx, minHeight: '80px', resize: 'vertical' }}
            placeholder="Mô tả ngắn về nội dung tài liệu"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
            Danh mục
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={inputSx}
          >
            <option value="">-- Chưa phân loại --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Xóa tài liệu"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', backgroundColor: 'transparent',
              color: '#dc2626', border: '1px solid #fecaca',
              borderRadius: '6px', fontSize: '14px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            <Trash2 size={14} />
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                padding: '8px 16px', backgroundColor: 'transparent',
                color: 'var(--color-text-dark)', border: '1px solid var(--color-border)',
                borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              style={{
                padding: '8px 16px', backgroundColor: 'var(--color-primary)',
                color: 'white', border: 'none', borderRadius: '6px',
                fontSize: '14px', fontWeight: 500,
                cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !title.trim() ? 0.6 : 1,
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}