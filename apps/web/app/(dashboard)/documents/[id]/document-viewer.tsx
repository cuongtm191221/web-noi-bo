'use client';

import { useState, useCallback } from 'react';
import { ProcessingStatus } from './processing-status';
import { SummaryTab } from './summary-tab';
import { FlowchartTab } from './flowchart-tab';

type Props = {
  documentId: string;
  hasSummary: boolean;
  hasFlowchart: boolean;
};

type Tab = 'viewer' | 'summary' | 'flowchart';

export function DocumentViewer({ documentId, hasSummary, hasFlowchart }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('viewer');
  const [status, setStatus] = useState({
    hasSummary,
    hasFlowchart,
  });

  const handleStatusUpdate = useCallback((s: { hasSummary: boolean; hasFlowchart: boolean }) => {
    setStatus(s);
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
        initialHasFlowchart={hasFlowchart}
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
          onClick={() => setActiveTab('flowchart')}
          disabled={!status.hasFlowchart}
          style={tabStyle(activeTab === 'flowchart', !status.hasFlowchart)}
          title={status.hasFlowchart ? '' : 'Đang xử lý AI...'}
        >
          Sơ đồ
        </button>
      </div>

      {activeTab === 'summary' && status.hasSummary && (
        <SummaryTab documentId={documentId} />
      )}

      {activeTab === 'flowchart' && status.hasFlowchart && (
        <FlowchartTab documentId={documentId} />
      )}

      {activeTab === 'viewer' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
        }}>
          <p>Document viewer (Plan 6)</p>
        </div>
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

      {activeTab === 'flowchart' && !status.hasFlowchart && (
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
          AI đang tạo sơ đồ, vui lòng đợi...
        </div>
      )}
    </>
  );
}