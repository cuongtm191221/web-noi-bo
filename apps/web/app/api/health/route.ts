import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dbStatus: 'ok' | 'error' = 'error';
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const uptime = process.uptime();
  const responseTime = Date.now() - start;

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';
  const httpStatus = status === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status,
      db: dbStatus,
      uptime: Math.floor(uptime),
      responseTimeMs: responseTime,
      timestamp: new Date().toISOString(),
      ...(dbError ? { dbError } : {}),
    },
    { status: httpStatus },
  );
}
