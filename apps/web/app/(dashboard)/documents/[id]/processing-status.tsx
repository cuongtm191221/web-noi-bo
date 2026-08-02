'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
  initialHasSummary: boolean;
  initialHasFlowchart: boolean;
  initialHasCitations: boolean;
  onUpdate: (s: { hasSummary: boolean; hasFlowchart: boolean; hasCitations: boolean }) => void;
};

export function ProcessingStatus({
  documentId,
  initialHasSummary,
  initialHasFlowchart,
  initialHasCitations,
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
        hasCitations: data.citationCount > 0,
      });
    }
  }, [data, onUpdate]);

  return null;
}