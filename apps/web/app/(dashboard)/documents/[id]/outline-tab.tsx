'use client';

import { useState } from 'react';

type OutlineNode = {
  text: string;
  level: number;
  chunk_index: number;
  page_number: number | null;
  slide_number: number | null;
  sheet_name: string | null;
  row_number: number | null;
  children: OutlineNode[];
};

type Props = {
  documentId: string;
  onNodeClick: (pageNumber: number | undefined) => void;
};

export function OutlineTab({ documentId, onNodeClick }: Props) {
  const [data, setData] = useState<OutlineNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: '#dc2626',
      }}>
        Lỗi tải outline: {error}
      </div>
    );
  }

  if (!data) {
    // Lazy load
    fetch(`/api/documents/${documentId}/outline`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d.outline))
      .catch((e) => setError(e.message));
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        Đang tải outline...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        Không tìm thấy heading nào trong tài liệu
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Mục lục ({countNodes(data)} mục)
      </h3>
      <OutlineList nodes={data} onNodeClick={onNodeClick} />
    </div>
  );
}

function OutlineList({
  nodes,
  onNodeClick,
  depth = 0,
}: {
  nodes: OutlineNode[];
  onNodeClick: (pageNumber: number | undefined) => void;
  depth?: number;
}) {
  return (
    <ul style={{
      listStyle: 'none',
      padding: 0,
      margin: 0,
      marginLeft: depth === 0 ? 0 : '20px',
      borderLeft: depth === 0 ? 'none' : '2px solid var(--color-border)',
    }}>
      {nodes.map((node, idx) => (
        <li
          key={`${node.chunk_index}-${idx}`}
          style={{
            padding: '8px 12px',
            marginTop: idx === 0 ? 0 : '4px',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onClick={() => onNodeClick(node.page_number ?? undefined)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LevelBadge level={node.level} />
            <span style={{
              flex: 1,
              fontSize: depth === 0 ? '15px' : '14px',
              fontWeight: depth === 0 ? 500 : 400,
              color: 'var(--color-text-dark)',
            }}>
              {node.text}
            </span>
            {node.page_number !== null && (
              <span style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                backgroundColor: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                Trang {node.page_number}
              </span>
            )}
            {node.slide_number !== null && (
              <span style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                backgroundColor: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                Slide {node.slide_number}
              </span>
            )}
          </div>
          {node.children.length > 0 && (
            <OutlineList
              nodes={node.children}
              onNodeClick={onNodeClick}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function LevelBadge({ level }: { level: number }) {
  const colorMap: Record<number, { bg: string; fg: string; label: string }> = {
    1: { bg: '#0d226b', fg: 'white', label: '1' },
    2: { bg: '#005c9e', fg: 'white', label: '2' },
    3: { bg: '#009f4d', fg: 'white', label: '3' },
    4: { bg: '#6b7280', fg: 'white', label: '4' },
  };
  const colors = colorMap[level] ?? colorMap[4];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      backgroundColor: colors.bg,
      color: colors.fg,
      fontSize: '11px',
      fontWeight: 600,
    }}>
      L{colors.label}
    </span>
  );
}

function countNodes(nodes: OutlineNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}