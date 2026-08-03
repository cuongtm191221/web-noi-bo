'use client';

import { useRouter } from 'next/navigation';
import { EditDocumentModal } from './edit-document-modal';

export function EditDocumentButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  return (
    <EditDocumentModal
      documentId={documentId}
      onUpdated={() => router.refresh()}
      onDeleted={() => router.push('/documents')}
    />
  );
}