'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { ALLOWED_MIME_TYPES } from '@/lib/document-helpers';

const ACCEPT_ATTR = Object.values(ALLOWED_MIME_TYPES).join(',') +
  ',.pdf,.docx,.xlsx,.pptx,.md,.txt';

export function UploadButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (file.size > 50 * 1024 * 1024) {
      setError('File quá lớn (>50MB).');
      return;
    }

    const title = file.name.replace(/\.[^.]+$/, '');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    startTransition(async () => {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Upload failed');
        return;
      }

      router.refresh();
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          fontWeight: 600,
          padding: '8px 16px',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {isPending ? (
          <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
        ) : (
          <Upload style={{ width: '16px', height: '16px' }} />
        )}
        Upload tài liệu
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {error && (
        <div style={{
          marginTop: '8px',
          fontSize: '14px',
          color: '#dc2626',
          backgroundColor: '#fef2f2',
          padding: '8px 12px',
          borderRadius: '6px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
