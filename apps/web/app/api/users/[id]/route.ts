import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Prevent admin from deactivating themselves
  if (id === session.user.id && body.deactivatedAt !== undefined) {
    return NextResponse.json({ error: 'Không thể vô hiệu hóa tài khoản của chính mình' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (body.role && ['admin', 'editor', 'viewer'].includes(body.role)) data.role = body.role;
  if (body.deactivatedAt === null) data.deactivatedAt = null;
  if (body.deactivatedAt === 'now') data.deactivatedAt = new Date();

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, deactivatedAt: true },
  });

  const action = body.deactivatedAt === 'now'
    ? 'USER_DEACTIVATE'
    : body.deactivatedAt === null
    ? 'USER_REACTIVATE'
    : 'USER_UPDATE';

  void logActivity({
    userId: session.user.id,
    action,
    entityType: 'user',
    entityId: id,
    metadata: { changes: Object.keys(data) },
  });

  return NextResponse.json({ user });
}