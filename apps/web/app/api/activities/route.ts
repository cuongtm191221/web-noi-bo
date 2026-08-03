import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));
  const actionFilter = url.searchParams.get('action') ?? '';
  const entityFilter = url.searchParams.get('entity') ?? '';

  const where: Record<string, unknown> = {};
  // Non-admin only sees own activities
  if (session.user.role !== 'admin') {
    where.userId = session.user.id;
  }
  if (actionFilter) where.action = actionFilter;
  if (entityFilter) where.entityType = entityFilter;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  return NextResponse.json({
    activities: activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      user: a.user,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
    total,
  });
}