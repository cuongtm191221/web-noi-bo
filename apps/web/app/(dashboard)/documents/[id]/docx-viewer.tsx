'use client';

import { useEffect, useState } from 'react';

type Props = {
  documentId: string;
};

export function DocxViewer({ documentId }: Props) {
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHtml = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/docx-html`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setHtml(data.html);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    fetchHtml();
  }, [documentId]);

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
        Lỗi tải DOCX: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        lineHeight: '1.6',
        fontSize: '15px',
        color: 'var(--color-text-dark)',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}