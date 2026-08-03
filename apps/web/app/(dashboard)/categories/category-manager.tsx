'use client';

import { useEffect, useState } from 'react';
import { Pencil, Trash2, FolderOpen } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  parentId: string | null;
  _count?: { documents: number };
};

const PRESET_COLORS = [
  '#005c9e', // primary blue
  '#009f4d', // green
  '#0d226b', // dark blue
  '#dc2626', // red
  '#ea580c', // orange
  '#ca8a04', // yellow
  '#7c3aed', // purple
  '#0891b2', // cyan
];

export function CategoryManager({ isAdmin }: { isAdmin: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCategories(data.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (c: Category) => {
    const count = c._count?.documents ?? 0;
    if (count > 0) {
      alert(`Không thể xóa "${c.name}" vì còn ${count} tài liệu.`);
      return;
    }
    if (!confirm(`Xóa danh mục "${c.name}"?`)) return;
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
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
      }}>
        {isAdmin && (
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setCreating(true)}
              style={{
                padding: '8px 16px', backgroundColor: 'var(--color-primary)',
                color: 'white', border: 'none', borderRadius: '6px',
                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              + Tạo danh mục
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Đang tải...
          </div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Chưa có danh mục nào. {isAdmin && 'Tạo danh mục đầu tiên.'}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px',
          }}>
            {categories.map((c) => (
              <CategoryCard
                key={c.id}
                category={c}
                isAdmin={isAdmin}
                onEdit={() => setEditing(c)}
                onDelete={() => handleDelete(c)}
                onManage={() => { window.location.href = `/documents?category=${c.id}`; }}
              />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <CategoryModal
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}
      {editing && (
        <CategoryModal
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function CategoryCard({
  category,
  isAdmin,
  onEdit,
  onDelete,
  onManage,
}: {
  category: Category;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onManage: () => void;
}) {
  const count = category._count?.documents ?? 0;
  return (
    <div
      style={{
        padding: '14px',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        backgroundColor: 'white',
        borderLeftWidth: '4px',
        borderLeftColor: category.color,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-dark)' }}>
          {category.name}
        </span>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            backgroundColor: category.color,
            color: 'white',
            borderRadius: '10px',
            fontWeight: 500,
          }}
        >
          {count} tài liệu
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
        slug: <code style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '3px' }}>
          {category.slug}
        </code>
      </div>
      {isAdmin && (
        <div style={{
          display: 'flex', gap: '4px', marginTop: 'auto',
          paddingTop: '8px', borderTop: '1px solid var(--color-border)',
        }}>
          <button
            onClick={onManage}
            title="Quản lý tài liệu"
            style={{
              flex: 1, display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', gap: '4px',
              padding: '6px 8px',
              backgroundColor: 'transparent',
              color: 'var(--color-primary)',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <FolderOpen size={14} />
            Tài liệu
          </button>
          <button
            onClick={onEdit}
            title="Sửa danh mục"
            style={{
              padding: '6px 8px',
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Xóa danh mục"
            style={{
              padding: '6px 8px',
              backgroundColor: 'transparent',
              color: '#dc2626',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category?: Category;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState(category?.color ?? '#005c9e');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!category;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/categories/${category!.id}` : '/api/categories';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
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
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', zIndex: 100,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        maxWidth: '480px', width: '100%', padding: '24px',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
          {isEdit ? 'Sửa danh mục' : 'Tạo danh mục'}
        </h2>
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
            Tên danh mục
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Quy trình đào tạo"
            style={inputSx}
            maxLength={100}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
            Màu sắc
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: '32px', height: '32px', borderRadius: '6px',
                  backgroundColor: c, border: color === c ? '3px solid #1e293b' : '1px solid #cbd5e1',
                  cursor: 'pointer', padding: 0,
                }}
                aria-label={`Color ${c}`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: '32px', height: '32px', borderRadius: '6px',
                border: '1px solid #cbd5e1', cursor: 'pointer', padding: 0,
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)', color: 'white',
              border: 'none', borderRadius: '6px', fontSize: '14px',
              fontWeight: 500,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !name.trim() ? 0.6 : 1,
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}