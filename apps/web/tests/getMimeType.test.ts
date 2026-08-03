import { describe, it, expect } from 'vitest';

type MimeType = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'md' | 'txt';

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    md: 'text/markdown',
    txt: 'text/plain',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}

describe('getMimeType', () => {
  it('returns PDF mime for .pdf', () => {
    expect(getMimeType('doc.pdf')).toBe('application/pdf');
  });

  it('returns DOCX mime for .docx', () => {
    expect(getMimeType('doc.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('returns PPTX mime for .pptx', () => {
    expect(getMimeType('slides.pptx')).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
  });

  it('returns XLSX mime for .xlsx', () => {
    expect(getMimeType('data.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('returns md mime for .md', () => {
    expect(getMimeType('readme.md')).toBe('text/markdown');
  });

  it('returns txt mime for .txt', () => {
    expect(getMimeType('notes.txt')).toBe('text/plain');
  });

  it('returns octet-stream for unknown', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream');
  });

  it('handles uppercase extensions', () => {
    expect(getMimeType('doc.PDF')).toBe('application/pdf');
  });

  it('handles filenames with multiple dots', () => {
    expect(getMimeType('file.v2.pdf')).toBe('application/pdf');
  });
});
