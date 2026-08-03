import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

async function getAccessibleDocIds(session: { user?: { id?: string; role?: string } }, ids: string[]): Promise<string[]> {
  if (!session?.user?.id) return [];
  const docs = await prisma.document.findMany({
    where: { id: { in: ids } },
    select: { id: true, uploaderId: true },
  });
  if (session.user.role === 'admin') return docs.map((d) => d.id);
  return docs.filter((d) => d.uploaderId === session.user!.id).map((d) => d.id);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No ids' }, { status: 400 });
  }

  const allowed = await getAccessibleDocIds(session, ids);
  if (allowed.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.action === 'assignCategory') {
    if (body.categoryId !== undefined) {
      data.categoryId = body.categoryId || null;
    }
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const result = await prisma.document.updateMany({
    where: { id: { in: allowed } },
    data,
  });

  for (const id of allowed) {
    void logActivity({
      userId: session.user.id,
      action: 'EDIT',
      entityType: 'document',
      entityId: id,
      metadata: { bulk: true, action: body.action, categoryId: body.categoryId },
    });
  }

  return NextResponse.json({ updated: result.count });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No ids' }, { status: 400 });
  }

  const allowed = await getAccessibleDocIds(session, ids);
  if (allowed.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get storage paths for cleanup
  const docs = await prisma.document.findMany({
    where: { id: { in: allowed } },
    select: { storagePath: true },
  });

  await prisma.document.deleteMany({ where: { id: { in: allowed } } });

  // Best-effort file cleanup
  const { unlink } = await import('fs/promises');
  await Promise.all(
    docs.map((d) =>
      d.storagePath
        ? unlink(d.storagePath).catch(() => undefined)
        : Promise.resolve(),
    ),
  );

  for (const id of allowed) {
    void logActivity({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'document',
      entityId: id,
      metadata: { bulk: true },
    });
  }

  return NextResponse.json({ deleted: allowed.length });
}