'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
  onCitationClick: (page: number | undefined) => void;
};

function formatLocation(cit: {
  pageNumber: number | null;
  slideNumber: number | null;
  sheetName: string | null;
  rowNumber: number | null;
  columnLetter: string | null;
}): string {
  if (cit.pageNumber) return `[trang ${cit.pageNumber}]`;
  if (cit.slideNumber) return `[slide ${cit.slideNumber}]`;
  if (cit.sheetName) {
    let loc = `[sheet "${cit.sheetName}"`;
    if (cit.rowNumber) loc += `, hàng ${cit.rowNumber}`;
    if (cit.columnLetter) loc += `, cột ${cit.columnLetter}`;
    loc += ']';
    return loc;
  }
  return '[không xác định]';
}

export function CitationTab({ documentId, onCitationClick }: Props) {
  const { data, isLoading, error } = trpc.documents.getCitations.useQuery({
    id: documentId,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleClick = (id: string, pageNumber: number | null) => {
    setSelectedId(id);
    onCitationClick(pageNumber ?? undefined);
  };

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        Đang tải...
      </div>
    );
  }

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
        Lỗi tải trích dẫn
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        AI chưa tạo trích dẫn
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
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>
        Trích dẫn ({data.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {data.map((cit) => {
          const isSelected = selectedId === cit.id;
          const location = formatLocation(cit);
          return (
            <div
              key={cit.id}
              onClick={() => handleClick(cit.id, cit.pageNumber)}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: isSelected
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                backgroundColor: isSelected ? '#eff6ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {cit.order + 1}
                </span>
                <div style={{ flex: 1, fontSize: '14px', lineHeight: '1.5' }}>
                  <div style={{ color: 'var(--color-text-dark)', marginBottom: '6px' }}>
                    {cit.claimText}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    fontWeight: 500,
                  }}>
                    {location}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}