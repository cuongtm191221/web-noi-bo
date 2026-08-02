'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  documentId: string;
  highlightPage?: number;
};

export function PdfViewer({ documentId, highlightPage }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const fileUrl = `/api/documents/${documentId}/content`;

  const onLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (highlightPage) {
      setPageNumber(highlightPage);
    }
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button
          onClick={goToPrevPage}
          disabled={pageNumber <= 1}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
            opacity: pageNumber <= 1 ? 0.5 : 1,
          }}
        >
          ← Trang trước
        </button>
        <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Trang {pageNumber} / {numPages}
        </span>
        <button
          onClick={goToNextPage}
          disabled={pageNumber >= numPages}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer',
            opacity: pageNumber >= numPages ? 0.5 : 1,
          }}
        >
          Trang sau →
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Document
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          loading={<div style={{ padding: '32px' }}>Đang tải PDF...</div>}
          error={<div style={{ padding: '32px', color: '#dc2626' }}>Lỗi tải PDF</div>}
        >
          <Page
            pageNumber={pageNumber}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            width={800}
          />
        </Document>
      </div>
    </div>
  );
}