import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PdfViewer } from '../app/(dashboard)/documents/[id]/pdf-viewer';

describe('PdfViewer', () => {
  it('renders loading state initially', () => {
    const { container } = render(<PdfViewer documentId="test-id" />);
    // Should render container div
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with highlightPage prop', () => {
    const { container } = render(
      <PdfViewer documentId="test-id" highlightPage={3} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders prev/next buttons', () => {
    const { getByText } = render(<PdfViewer documentId="test-id" />);
    expect(getByText(/Trang trước/)).toBeTruthy();
    expect(getByText(/Trang sau/)).toBeTruthy();
  });
});
