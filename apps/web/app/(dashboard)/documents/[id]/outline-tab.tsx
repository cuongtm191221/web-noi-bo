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
  preview_text?: string;
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
        Sơ đồ nội dung ({countNodes(data)} mục)
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
        <OutlineItem
          key={`${node.chunk_index}-${idx}`}
          node={node}
          onNodeClick={onNodeClick}
          depth={depth}
        />
      ))}
    </ul>
  );
}

function OutlineItem({
  node,
  onNodeClick,
  depth,
}: {
  node: OutlineNode;
  onNodeClick: (pageNumber: number | undefined) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const hasChildren = node.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else {
      onNodeClick(node.page_number ?? undefined);
    }
  };

  return (
    <li
      style={{
        marginTop: '6px',
        borderRadius: '6px',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '8px 12px',
          cursor: 'pointer',
        }}
        onClick={handleClick}
      >
        <LevelBadge level={node.level} />
        <span style={{
          flex: 1,
          fontSize: depth === 0 ? '15px' : '14px',
          fontWeight: depth === 0 ? 600 : (depth === 1 ? 500 : 400),
          color: 'var(--color-text-dark)',
          lineHeight: 1.5,
        }}>
          {node.text}
        </span>
        {hasChildren && (
          <span style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}>
            ▶
          </span>
        )}
        {!hasChildren && node.page_number !== null && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick(node.page_number ?? undefined);
            }}
            style={{
              fontSize: '11px',
              padding: '3px 10px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            title="Xem chi tiết trong tài liệu"
          >
            Xem →
          </button>
        )}
        {!hasChildren && node.page_number !== null && (
          <span style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}>
            Trang {node.page_number}
          </span>
        )}
        {!hasChildren && node.slide_number !== null && (
          <span style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}>
            Slide {node.slide_number}
          </span>
        )}
      </div>

      {/* Preview text */}
      {expanded && node.preview_text && (
        <div style={{
          marginLeft: '32px',
          marginTop: '4px',
          marginBottom: '8px',
          padding: '10px 14px',
          backgroundColor: '#f1f5f9',
          borderLeft: '3px solid var(--color-primary)',
          borderRadius: '4px',
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--color-text-dark)',
        }}>
          {node.preview_text}
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <OutlineList nodes={node.children} onNodeClick={onNodeClick} depth={depth + 1} />
      )}
    </li>
  );
}

function LevelBadge({ level }: { level: number }) {
  const colorMap: Record<1 | 2 | 3 | 4, { bg: string; label: string }> = {
    1: { bg: '#0d226b', label: 'C' },
    2: { bg: '#005c9e', label: 'Đ' },
    3: { bg: '#009f4d', label: 'M' },
    4: { bg: '#6b7280', label: 'K' },
  };
  const safeLevel: 1 | 2 | 3 | 4 = (level === 1 || level === 2 || level === 3 || level === 4) ? level : 4;
  const colors = colorMap[safeLevel];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '22px',
      borderRadius: '4px',
      backgroundColor: colors.bg,
      color: 'white',
      fontSize: '12px',
      fontWeight: 600,
      flexShrink: 0,
    }}>
      {colors.label}
    </span>
  );
}

function countNodes(nodes: OutlineNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}