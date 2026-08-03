'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, FileText, FileType, FileSpreadsheet, Presentation, FileCode } from 'lucide-react';

type Category = { id: string; name: string; color: string };

type Result = {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  format: string;
  sizeBytes: number;
  category: { name: string; color: string } | null;
  uploader: { name: string };
  createdAt: string;
  snippet: string;
};

const FORMAT_ICONS: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  pdf: FileText,
  docx: FileType,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
  md: FileCode,
  txt: FileText,
};

const FORMAT_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'pptx', label: 'PPTX' },
  { value: 'xlsx', label: 'XLSX' },
  { value: 'md', label: 'Markdown' },
  { value: 'txt', label: 'Text' },
];

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: '#fef08a', padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function SearchForm({
  initialQ,
  initialCategory,
  initialFormat,
  categories,
}: {
  initialQ: string;
  initialCategory: string;
  initialFormat: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);
  const [format, setFormat] = useState(initialFormat);
  const [results, setResults] = useState<Result[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const runSearch = async (query: string, cat: string, fmt: string) => {
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (cat) params.set('category', cat);
      if (fmt) params.set('format', fmt);
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data.results);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search on mount/filter change
  useEffect(() => {
    runSearch(initialQ, initialCategory, initialFormat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ, initialCategory, initialFormat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    if (format) params.set('format', format);
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const inputSx: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'white', borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '20px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon
              size={16}
              style={{
                position: 'absolute', top: '50%', left: '12px',
                transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tiêu đề, mô tả, tên file..."
              style={{
                ...inputSx,
                width: '100%',
                paddingLeft: '36px',
              }}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Tìm
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ ...inputSx, minWidth: '180px' }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{ ...inputSx, minWidth: '140px' }}
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </form>

      {loading ? (
        <div style={{
          backgroundColor: 'white', padding: '32px', textAlign: 'center',
          borderRadius: '8px', color: 'var(--color-text-muted)',
        }}>
          Đang tìm...
        </div>
      ) : results.length === 0 ? (
        <div style={{
          backgroundColor: 'white', padding: '32px', textAlign: 'center',
          borderRadius: '8px', color: 'var(--color-text-muted)', fontSize: '14px',
        }}>
          {initialQ
            ? `Không tìm thấy kết quả cho "${initialQ}"`
            : 'Nhập từ khoá để bắt đầu tìm kiếm.'}
        </div>
      ) : (
        <>
          <div style={{
            fontSize: '14px', color: 'var(--color-text-muted)',
            marginBottom: '12px',
          }}>
            {total} kết quả cho "<strong>{initialQ}</strong>"
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((r) => {
              const Icon = FORMAT_ICONS[r.format] || FileText;
              return (
                <Link
                  key={r.id}
                  href={`/documents/${r.id}`}
                  style={{
                    backgroundColor: 'white', borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '16px',
                    textDecoration: 'none', color: 'inherit',
                    border: '1px solid var(--color-border)',
                    display: 'flex', gap: '12px',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <Icon style={{ width: '20px', height: '20px', flexShrink: 0, marginTop: '4px', color: 'var(--color-primary)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '15px', fontWeight: 600,
                      color: 'var(--color-primary)',
                      marginBottom: '4px',
                    }}>
                      {highlight(r.title, initialQ)}
                    </div>
                    {r.snippet && (
                      <div style={{
                        fontSize: '13px', color: 'var(--color-text-dark)',
                        lineHeight: 1.5, marginBottom: '6px',
                        wordBreak: 'break-word',
                      }}>
                        {highlight(r.snippet, initialQ)}
                      </div>
                    )}
                    <div style={{
                      display: 'flex', gap: '12px', flexWrap: 'wrap',
                      fontSize: '12px', color: 'var(--color-text-muted)',
                      alignItems: 'center',
                    }}>
                      <span>{r.format.toUpperCase()} · {formatBytes(r.sizeBytes)}</span>
                      <span>·</span>
                      <span>{r.uploader.name}</span>
                      {r.category && (
                        <>
                          <span>·</span>
                          <span style={{
                            padding: '1px 8px',
                            backgroundColor: r.category.color,
                            color: 'white',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}>
                            {r.category.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}