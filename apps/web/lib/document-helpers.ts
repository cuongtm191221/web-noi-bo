import { fileTypeFromBuffer } from 'file-type';

export const ALLOWED_MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  md: 'text/markdown',
  txt: 'text/plain',
} as const;

export type DocumentFormat = keyof typeof ALLOWED_MIME_TYPES;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function validateFileSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${sizeBytes} bytes (max ${MAX_FILE_SIZE_BYTES})`);
  }
}

export async function validateFileType(
  buffer: Buffer,
  filename: string
): Promise<{ format: DocumentFormat; mimeType: string }> {
  const ext = filename.split('.').pop()?.toLowerCase() as DocumentFormat | undefined;
  if (!ext || !(ext in ALLOWED_MIME_TYPES)) {
    throw new Error(`Unsupported format: file extension "${ext}" not allowed`);
  }

  // Detect actual file type from magic number
  const detected = await fileTypeFromBuffer(buffer);

  // For MD/TXT, file-type may return null — trust extension
  if (ext === 'md' || ext === 'txt') {
    return { format: ext, mimeType: ALLOWED_MIME_TYPES[ext] };
  }

  if (!detected) {
    throw new Error('Could not detect file type from content');
  }

  const expectedMime = ALLOWED_MIME_TYPES[ext];
  // file-type returns application/zip for docx/xlsx/pptx — accept ZIP as valid for Office docs
  const isOfficeFormat = ['docx', 'xlsx', 'pptx'].includes(ext);
  if (detected.mime !== expectedMime && !(detected.mime === 'application/zip' && isOfficeFormat)) {
    throw new Error(
      `File extension "${ext}" does not match content type "${detected.mime}". ` +
      `Expected ${expectedMime}.`
    );
  }

  return { format: ext, mimeType: expectedMime };
}
