import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color)) data.color = body.color;
  if (body.icon !== undefined) data.icon = body.icon || null;
  if (body.parentId !== undefined) data.parentId = body.parentId || null;

  const category = await prisma.category.update({
    where: { id },
    data,
    select: { id: true, name: true, slug: true, color: true, icon: true },
  });

  return NextResponse.json({ category });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Check if category has documents
  const count = await prisma.document.count({ where: { categoryId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Không thể xóa: còn ${count} tài liệu. Hãy gỡ category trước.` },
      { status: 400 },
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}