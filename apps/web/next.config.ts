import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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