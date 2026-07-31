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

    // Client-side size check
    if (file.size > 50 * 1024 * 1024) {
      setError('File quá lớn (>50MB).');
      return;
    }

    // Use filename as title (user can edit later)
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
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 rounded-md transition-all disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        Upload tài liệu
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ''; // Allow re-selecting same file
        }}
      />

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
