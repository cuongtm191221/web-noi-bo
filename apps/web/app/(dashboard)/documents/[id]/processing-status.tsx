'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

type Props = {
  documentId: string;
  initialHasSummary: boolean;
  initialHasOutline: boolean;
  onUpdate: (s: { hasSummary: boolean; hasOutline: boolean }) => void;
};

export function ProcessingStatus({
  documentId,
  initialHasSummary,
  initialHasOutline,
  onUpdate,
}: Props) {
  const isProcessing = !initialHasSummary || !initialHasOutline;

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
        hasOutline: data.hasOutline,
      });
    }
  }, [data, onUpdate]);

  return null;
}
