'use client';

import { useEffect, useState } from 'react';

type Props = {
  documentId: string;
};

type Sheet = {
  name: string;
  data: string[][];
};

export function XlsxViewer({ documentId }: Props) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/xlsx-data`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setSheets(data.sheets);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    fetchSheets();
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
        Lỗi tải XLSX: {error}
      </div>
    );
  }

  if (sheets.length === 0) {
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

  const current = sheets[activeSheet];
  const maxRows = current?.data.length ?? 0;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      {sheets.length > 1 && (
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sheets.map((sheet, idx) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheet(idx)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: activeSheet === idx ? 600 : 400,
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                backgroundColor: activeSheet === idx ? 'var(--color-primary)' : 'white',
                color: activeSheet === idx ? 'white' : 'var(--color-text-dark)',
                cursor: 'pointer',
              }}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div style={{
        fontSize: '13px',
        color: 'var(--color-text-muted)',
        marginBottom: '8px',
      }}>
        {current?.name ?? ''} • {maxRows} hàng
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {current?.data.slice(0, 100).map((row, rowIdx) => (
              <tr key={rowIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{
                  padding: '6px 8px',
                  fontWeight: 600,
                  backgroundColor: '#f8fafc',
                  color: 'var(--color-text-muted)',
                  minWidth: '50px',
                  textAlign: 'center',
                }}>
                  {rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    style={{
                      padding: '6px 8px',
                      borderLeft: '1px solid var(--color-border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {maxRows > 100 && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
        }}>
          Hiển thị 100/{maxRows} hàng đầu tiên
        </div>
      )}
    </div>
  );
}