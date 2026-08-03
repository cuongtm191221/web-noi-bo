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
};

export default nextConfig;
