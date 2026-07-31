import { describe, it, expect } from 'vitest';
import { validateFileType, validateFileSize, ALLOWED_MIME_TYPES } from '../../lib/document-helpers';

describe('document-helpers', () => {
  describe('ALLOWED_MIME_TYPES', () => {
    it('includes pdf, docx, xlsx, pptx, md, txt', () => {
      expect(ALLOWED_MIME_TYPES['pdf']).toBe('application/pdf');
      expect(ALLOWED_MIME_TYPES['docx']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(ALLOWED_MIME_TYPES['xlsx']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(ALLOWED_MIME_TYPES['pptx']).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
      expect(ALLOWED_MIME_TYPES['md']).toBe('text/markdown');
      expect(ALLOWED_MIME_TYPES['txt']).toBe('text/plain');
    });
  });

  describe('validateFileSize', () => {
    it('accepts file under 50MB', () => {
      expect(() => validateFileSize(1024)).not.toThrow();
      expect(() => validateFileSize(50 * 1024 * 1024)).not.toThrow();
    });

    it('rejects file over 50MB', () => {
      expect(() => validateFileSize(51 * 1024 * 1024)).toThrow(/File too large/);
    });
  });

  describe('validateFileType', () => {
    it('accepts valid PDF magic number', async () => {
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
      const result = await validateFileType(pdfHeader, 'document.pdf');
      expect(result.format).toBe('pdf');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('accepts valid DOCX (ZIP magic)', async () => {
      const docxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..
      const result = await validateFileType(docxHeader, 'document.docx');
      expect(result.format).toBe('docx');
    });

    it('accepts XLSX (ZIP magic)', async () => {
      const xlsxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      const result = await validateFileType(xlsxHeader, 'data.xlsx');
      expect(result.format).toBe('xlsx');
    });

    it('accepts PPTX (ZIP magic)', async () => {
      const pptxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      const result = await validateFileType(pptxHeader, 'slide.pptx');
      expect(result.format).toBe('pptx');
    });

    it('rejects mismatched extension and content', async () => {
      const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      await expect(validateFileType(pdfHeader, 'malware.exe')).rejects.toThrow(/extension/);
    });

    it('rejects unknown format', async () => {
      const unknownHeader = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      await expect(validateFileType(unknownHeader, 'file.xyz')).rejects.toThrow(/Unsupported format/);
    });
  });
});
