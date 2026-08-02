'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
  initialHasSummary: boolean;
  initialHasFlowchart: boolean;
  onUpdate: (s: { hasSummary: boolean; hasFlowchart: boolean; isProcessing: boolean }) => void;
};

export function ProcessingStatus({
  documentId,
  initialHasSummary,
  initialHasFlowchart,
  onUpdate,
}: Props) {
  const isProcessing = !initialHasSummary || !initialHasFlowchart;

  const { data } = trpc.documents.processingStatus.useQuery(
    { id: documentId },
    {
      enabled: isProcessing,
      refetchInterval: isProcessing ? 5000 : false,
      refetchIntervalInBackground: false,
    },
  );

  useEffect(() => {
    if (data) {
      onUpdate({
        hasSummary: data.hasSummary,
        hasFlowchart: data.hasFlowchart,
        isProcessing: !data.hasSummary || !data.hasFlowchart,
      });
    }
  }, [data, onUpdate]);

  return null;
}