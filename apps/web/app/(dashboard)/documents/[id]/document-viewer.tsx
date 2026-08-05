'use client';

import { useState, useCallback } from 'react';
import { ProcessingStatus } from './processing-status';
import { SummaryTab } from './summary-tab';
import { OutlineTab } from './outline-tab';
import { DocumentContent } from './document-content';

type Props = {
  documentId: string;
  format: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'md' | 'txt';
  hasSummary: boolean;
  hasOutline: boolean;
  canEdit: boolean;
  userRole: 'admin' | 'editor' | 'viewer';
};

type Tab = 'viewer' | 'summary' | 'outline';

export function DocumentViewer({
  documentId,
  format,
  hasSummary,
  hasOutline,
  canEdit,
  userRole,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('viewer');
  const [status, setStatus] = useState({
    hasSummary,
    hasOutline,
  });
  const [highlightPage, setHighlightPage] = useState<number | undefined>(undefined);

  const handleStatusUpdate = useCallback((s: { hasSummary: boolean; hasOutline: boolean }) => {
    setStatus(s);
  }, []);

  const handleCitationClick = useCallback((page: number | undefined) => {
    setHighlightPage(page);
    setActiveTab('viewer');
  }, []);

  const tabStyle = (isActive: boolean, isDisabled: boolean) => ({
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
    color: isDisabled
      ? 'var(--color-text-muted)'
      : isActive
      ? 'white'
      : 'var(--color-text-dark)',
    opacity: isDisabled ? 0.6 : 1,
  });

  return (
    <>
      <ProcessingStatus
        documentId={documentId}
        initialHasSummary={hasSummary}
        initialHasOutline={hasOutline}
        onUpdate={handleStatusUpdate}
      />

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '4px',
        marginBottom: '24px',
        display: 'inline-flex',
        gap: '4px',
      }}>
        <button
          onClick={() => setActiveTab('viewer')}
          style={tabStyle(activeTab === 'viewer', false)}
        >
          Tài liệu
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          disabled={!status.hasSummary}
          style={tabStyle(activeTab === 'summary', !status.hasSummary)}
          title={status.hasSummary ? '' : 'Đang xử lý AI...'}
        >
          Tóm tắt
        </button>
        <button
          onClick={() => setActiveTab('outline')}
          disabled={!status.hasOutline}
          style={tabStyle(activeTab === 'outline', !status.hasOutline)}
          title={status.hasOutline ? '' : 'Đang xử lý AI...'}
        >
          Mục lục
        </button>
      </div>

      {activeTab === 'summary' && status.hasSummary && (
        <SummaryTab documentId={documentId} />
      )}

      {activeTab === 'outline' && status.hasOutline && (
        <OutlineTab documentId={documentId} onNodeClick={handleCitationClick} />
      )}

      {activeTab === 'viewer' && (
        <DocumentContent
          documentId={documentId}
          format={format}
          highlightPage={highlightPage}
        />
      )}

      {activeTab === 'summary' && !status.hasSummary && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#1e40af',
            animation: 'pulse 1.5s ease-in-out infinite',
            marginRight: '8px',
          }} />
          AI đang xử lý tóm tắt, vui lòng đợi...
        </div>
      )}

      {activeTab === 'outline' && !status.hasOutline && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#1e40af',
            animation: 'pulse 1.5s ease-in-out infinite',
            marginRight: '8px',
          }} />
          Đang trích xuất mục lục...
        </div>
      )}
    </>
  );
}
