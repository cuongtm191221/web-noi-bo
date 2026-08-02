'use client';

import ReactMarkdown from 'react-markdown';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
};

export function SummaryTab({ documentId }: Props) {
  const { data, isLoading, error } = trpc.documents.getSummary.useQuery({
    id: documentId,
  });

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

  if (error || !data) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: '#dc2626',
      }}>
        Lỗi tải tóm tắt
      </div>
    );
  }

  if (!data.summary) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        AI chưa tạo tóm tắt
      </div>
    );
  }

  const checklist = (data.summary.checklist as string[]) ?? [];

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--color-primary)' }}>
        Tóm tắt
      </h2>
      <div style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '24px', color: 'var(--color-text-dark)' }}>
        <ReactMarkdown>{data.summary.executiveSummary}</ReactMarkdown>
      </div>

      {checklist.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-dark)' }}>
            Checklist
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {checklist.map((item, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px 0',
                  fontSize: '14px',
                  color: 'var(--color-text-dark)',
                }}
              >
                <input
                  type="checkbox"
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid var(--color-border)',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
      }}>
        Tạo bởi {data.summary.modelUsed} •{' '}
        {new Date(data.summary.createdAt).toLocaleString('vi-VN')}
      </div>
    </div>
  );
}