'use client';

import { PdfViewer } from './pdf-viewer';
import { DocxViewer } from './docx-viewer';
import { PptxViewer } from './pptx-viewer';
import { XlsxViewer } from './xlsx-viewer';
import { MdViewer } from './md-viewer';

type Props = {
  documentId: string;
  format: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'md' | 'txt';
  highlightPage?: number;
};

export function DocumentContent({ documentId, format, highlightPage }: Props) {
  switch (format) {
    case 'pdf':
      return <PdfViewer documentId={documentId} highlightPage={highlightPage} />;
    case 'docx':
      return <DocxViewer documentId={documentId} />;
    case 'pptx':
      return <PptxViewer documentId={documentId} />;
    case 'xlsx':
      return <XlsxViewer documentId={documentId} />;
    case 'md':
    case 'txt':
      return <MdViewer documentId={documentId} format={format} />;
    default:
      return (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          Format không hỗ trợ: {format}
        </div>
      );
  }
}