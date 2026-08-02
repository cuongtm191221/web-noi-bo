'use client';

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
};

export function FlowchartTab({ documentId }: Props) {
  const { data, isLoading, error } = trpc.documents.getFlowchart.useQuery({
    id: documentId,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidInitialized = useRef(false);

  useEffect(() => {
    if (!data?.flowchart?.mermaidSyntax || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      const mermaid = (await import('mermaid')).default;

      if (!mermaidInitialized.current) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });
        mermaidInitialized.current = true;
      }

      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, data.flowchart!.mermaidSyntax);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid render failed:', err);
        if (!cancelled && containerRef.current) {
          const errorMsg = err instanceof Error ? err.message : 'Render error';
          containerRef.current.innerHTML = `<pre style="color: #dc2626; padding: 16px; background: #fef2f2; border-radius: 6px;">${errorMsg}</pre>`;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data]);

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
        Lỗi tải sơ đồ
      </div>
    );
  }

  if (!data.flowchart) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
      }}>
        AI chưa tạo sơ đồ
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
        Sơ đồ quy trình
      </h2>
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          minHeight: '200px',
          alignItems: 'center',
        }}
      />
      <details style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
        <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Xem Mermaid syntax
        </summary>
        <pre style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          fontSize: '12px',
          overflow: 'auto',
        }}>
          {data.flowchart.mermaidSyntax}
        </pre>
      </details>
    </div>
  );
}