'use client';

import { ReactNode } from 'react';

type Props = {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
};

export function LoadingState({
  loading,
  error,
  empty,
  emptyText = 'Không có dữ liệu',
  children,
}: Props) {
  if (loading) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '14px',
      }}>
        <div style={{
          display: 'inline-block',
          width: '20px',
          height: '20px',
          border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ marginTop: '8px' }}>Đang tải...</div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#991b1b',
        fontSize: '14px',
      }}>
        Lỗi: {error.message}
      </div>
    );
  }

  if (empty) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '14px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
      }}>
        {emptyText}
      </div>
    );
  }

  return <>{children}</>;
}