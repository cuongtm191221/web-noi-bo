'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, FileSpreadsheet, FileType, Presentation, FileCode, Trash2, Tag as TagIcon, X } from 'lucide-react';
import { DocumentStatusBadge } from '@/components/document-status-badge';
import { formatBytes } from '@/lib/format';
import { CategoryFilter } from './category-filter';

type Document = {
  id: string;
  title: string;
  format: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'md' | 'txt';
  sizeBytes: number;
  status: string;
  createdAt: string;
  uploader: { name: string };
  category: { name: string; color: string } | null;
};

type Category = { id: string; name: string; color: string };

const FORMAT_ICONS = {
  pdf: FileText,
  docx: FileType,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
  md: FileCode,
  txt: FileText,
} as const;

export function DocumentsClient({
  documents: initialDocs,
  categories,
  activeCategoryId,
}: {
  documents: Document[];
  categories: Category[];
  activeCategoryId: string | null;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);
  const [activeCatId, setActiveCatId] = useState(activeCategoryId);

  // Re-sync when props change (e.g., when filter URL changes)
  useEffect(() => {
    setDocs(initialDocs);
    setActiveCatId(activeCategoryId);
  }, [initialDocs, activeCategoryId]);

  const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('vi-VN');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [showAssign, setShowAssign] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allSelected = docs.length > 0 && selected.size === docs.length;
  const someSelected = selected.size > 0 && selected.size < docs.length;

  const toggleAll = () => {
    if (allSelected || someSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(docs.map((d) => d.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleAssign = async (categoryId: string | null) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await fetch('/api/documents/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'assignCategory', categoryId }),
      });
      if (!res.ok) {
        alert('Lỗi: ' + (await res.text()));
        return;
      }
      const cat = categoryId ? categories.find((c) => c.id === categoryId) : null;
      setDocs((prev) =>
        prev.map((d) =>
          ids.includes(d.id)
            ? { ...d, category: cat ? { name: cat.name, color: cat.color } : null }
            : d,
        ),
      );
      setSelected(new Set());
      setShowAssign(false);
      router.refresh();
    });
  };

  const handleDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await fetch('/api/documents/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        alert('Lỗi: ' + (await res.text()));
        return;
      }
      setDocs((prev) => prev.filter((d) => !ids.includes(d.id)));
      setSelected(new Set());
      setConfirmDelete(false);
    });
  };

  return (
    <>
      <CategoryFilter categories={categories} activeId={activeCategoryId} />

      {selected.size > 0 && (
        <div style={{
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(13,34,107,0.2)',
        }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>
            Đã chọn {selected.size} tài liệu
          </span>
          <button
            onClick={() => setShowAssign(true)}
            disabled={isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'white',
              color: 'var(--color-primary)',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <TagIcon size={14} />
            Gán danh mục
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
            Xóa
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              marginLeft: 'auto',
              padding: '6px 10px',
              backgroundColor: 'transparent',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
            Bỏ chọn
          </button>
        </div>
      )}

      {docs.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <FileText style={{ width: '48px', height: '48px', margin: '0 auto 12px', color: 'var(--color-border)' }} />
          <p>Chưa có tài liệu nào.</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: 'var(--color-bg-cream)' }}>
              <tr>
                <th style={{ width: '40px', padding: '12px 16px' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>Tên</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>Danh mục</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>Người upload</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, idx) => {
                const Icon = FORMAT_ICONS[doc.format];
                const isSelected = selected.has(doc.id);
                return (
                  <tr
                    key={doc.id}
                    style={{
                      borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
                      backgroundColor: isSelected ? '#f0f4ff' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(doc.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/documents/${doc.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          color: 'var(--color-primary)', textDecoration: 'none',
                        }}
                      >
                        <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{doc.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {doc.format.toUpperCase()} · {formatBytes(doc.sizeBytes)}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      {doc.category ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          backgroundColor: doc.category.color,
                          color: 'white',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}>
                          {doc.category.name}
                        </span>
                      ) : (
                        <em style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Chưa phân loại</em>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      {doc.uploader.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <DocumentStatusBadge status={doc.status as 'draft' | 'parsing' | 'published' | 'failed'} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                      {formatDate(doc.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAssign && (
        <AssignModal
          categories={categories}
          onClose={() => setShowAssign(false)}
          onAssign={handleAssign}
          count={selected.size}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          count={selected.size}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
          loading={isPending}
        />
      )}
    </>
  );
}

function AssignModal({
  categories,
  count,
  onClose,
  onAssign,
}: {
  categories: Category[];
  count: number;
  onClose: () => void;
  onAssign: (categoryId: string | null) => void;
}) {
  const [selectedCat, setSelectedCat] = useState<string>('');

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        maxWidth: '480px', width: '100%', padding: '24px',
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
          Gán danh mục
        </h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Gán danh mục cho {count} tài liệu đã chọn
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setSelectedCat('')}
            style={{
              padding: '10px 12px',
              backgroundColor: selectedCat === '' ? '#f1f5f9' : 'white',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <em>Bỏ phân loại</em>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              style={{
                padding: '10px 12px',
                backgroundColor: selectedCat === c.id ? '#f0f4ff' : 'white',
                borderTop: `1px solid ${selectedCat === c.id ? c.color : 'var(--color-border)'}`,
                borderRight: `1px solid ${selectedCat === c.id ? c.color : 'var(--color-border)'}`,
                borderBottom: `1px solid ${selectedCat === c.id ? c.color : 'var(--color-border)'}`,
                borderLeft: `4px solid ${c.color}`,
                borderRadius: '6px',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {c.name}
            </button>
          ))}
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
            onClick={() => onAssign(selectedCat || null)}
            style={{
              padding: '8px 16px', backgroundColor: 'var(--color-primary)',
              color: 'white', border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Gán
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  count,
  onClose,
  onConfirm,
  loading,
}: {
  count: number;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px',
        maxWidth: '420px', width: '100%', padding: '24px',
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600, color: '#dc2626' }}>
          Xóa {count} tài liệu?
        </h2>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--color-text-dark)' }}>
          Hành động này không thể hoàn tác. Tất cả chunks, summaries, citations và file vật lý sẽ bị xóa.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px', backgroundColor: 'transparent',
              color: 'var(--color-text-dark)', border: '1px solid var(--color-border)',
              borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
            }}
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px', backgroundColor: '#dc2626',
              color: 'white', border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </button>
        </div>
      </div>
    </div>
  );
}