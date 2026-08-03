import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

async function checkAccess(session: { user?: { id?: string; role?: string } }, uploaderId: string) {
  if (!session?.user?.id) return false;
  if (uploaderId === session.user.id) return true;
  if (session.user.role === 'admin') return true;
  // Fallback: re-fetch role from DB to avoid stale JWT
  const fresh = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, deactivatedAt: true },
  });
  if (fresh?.deactivatedAt) return false;
  return fresh?.role === 'admin' || uploaderId === session.user.id;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { uploaderId: true },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!(await checkAccess(session, doc.uploaderId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (body.description !== undefined) {
    data.description = typeof body.description === 'string' ? body.description.trim() : null;
  }
  if (body.categoryId !== undefined) {
    data.categoryId = body.categoryId || null;
  }

  const updated = await prisma.document.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      description: true,
      categoryId: true,
      category: { select: { name: true, color: true } },
    },
  });

  void logActivity({
    userId: session.user.id,
    action: 'EDIT',
    entityType: 'document',
    entityId: id,
    metadata: { changes: Object.keys(data) },
  });

  return NextResponse.json({ document: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { uploaderId: true, storagePath: true },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!(await checkAccess(session, doc.uploaderId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Cascade delete (chunks, summaries, citations, etc.)
  await prisma.document.delete({ where: { id } });

  // Best-effort: remove file from disk
  if (doc.storagePath) {
    try {
      await unlink(doc.storagePath);
    } catch (err) {
      console.warn(`Failed to unlink ${doc.storagePath}:`, err);
    }
  }

  void logActivity({
    userId: session.user.id,
    action: 'DELETE',
    entityType: 'document',
    entityId: id,
  });

  return NextResponse.json({ success: true });
}