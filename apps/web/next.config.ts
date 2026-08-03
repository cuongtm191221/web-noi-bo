import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone output cho production Docker (nhỏ hơn, self-contained)
  output: 'standalone',
  experimental: {
    // tRPC 11 requires this for App Router
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Allow tRPC + Prisma
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  // Hide Next.js dev indicator (the "N" icon bottom-right) for cleaner UI
  devIndicators: false,
};

export default nextConfig;
