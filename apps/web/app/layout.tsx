import type { Metadata } from 'next';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/client';

export const metadata: Metadata = {
  title: 'Rikkei Education - Hệ thống quản lý tài liệu',
  description: 'Hệ thống nội bộ quản lý tài liệu quy trình, quy định',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}