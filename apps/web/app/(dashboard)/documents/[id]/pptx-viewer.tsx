'use client';

import { useEffect, useState } from 'react';

type Props = {
  documentId: string;
};

type Slide = {
  slideNumber: number;
  text: string;
};

export function PptxViewer({ documentId }: Props) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlide, setActiveSlide] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/pptx-slides`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setSlides(data.slides);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    fetchSlides();
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
        Lỗi tải PPTX: {error}
      </div>
    );
  }

  if (slides.length === 0) {
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

  const current = slides.find((s) => s.slideNumber === activeSlide) ?? slides[0] ?? null;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button
          onClick={() => setActiveSlide(Math.max(1, activeSlide - 1))}
          disabled={activeSlide <= 1}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: activeSlide <= 1 ? 'not-allowed' : 'pointer',
            opacity: activeSlide <= 1 ? 0.5 : 1,
          }}
        >
          ← Slide trước
        </button>
        <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Slide {activeSlide} / {slides.length}
        </span>
        <button
          onClick={() => setActiveSlide(Math.min(slides.length, activeSlide + 1))}
          disabled={activeSlide >= slides.length}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: activeSlide >= slides.length ? 'not-allowed' : 'pointer',
            opacity: activeSlide >= slides.length ? 0.5 : 1,
          }}
        >
          Slide sau →
        </button>
      </div>

      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        padding: '32px',
        minHeight: '300px',
        whiteSpace: 'pre-wrap',
        fontSize: '15px',
        lineHeight: '1.6',
        color: 'var(--color-text-dark)',
      }}>
        {current?.text || '(Slide trống)'}
      </div>
    </div>
  );
}