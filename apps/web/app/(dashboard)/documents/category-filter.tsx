'use client';

import { useRouter } from 'next/navigation';

type Category = { id: string; name: string; color: string };

export function CategoryFilter({
  categories,
  activeId,
}: {
  categories: Category[];
  activeId: string | null;
}) {
  const router = useRouter();

  const handleClick = (id: string | null) => {
    const target = id ? `/documents?category=${id}` : '/documents';
    // Use replace + refresh to force re-fetch
    router.replace(target);
    router.refresh();
  };

  if (categories.length === 0) return null;

  const baseStyle: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
    border: '1px solid var(--color-border)',
    userSelect: 'none',
  };

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '8px',
      marginBottom: '16px',
    }}>
      <button
        type="button"
        onClick={() => handleClick(null)}
        style={{
          ...baseStyle,
          backgroundColor: activeId === null ? 'var(--color-text-dark)' : 'white',
          color: activeId === null ? 'white' : 'var(--color-text-dark)',
        }}
      >
        Tất cả
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => handleClick(c.id)}
          style={{
            ...baseStyle,
            backgroundColor: activeId === c.id ? c.color : 'white',
            color: activeId === c.id ? 'white' : 'var(--color-text-dark)',
            borderColor: activeId === c.id ? c.color : 'var(--color-border)',
          }}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}