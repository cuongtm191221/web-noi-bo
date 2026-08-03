import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
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
    select: {
      id: true,
      title: true,
      description: true,
      categoryId: true,
      uploaderId: true,
    },
  });

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    title: doc.title,
    description: doc.description,
    categoryId: doc.categoryId,
    canEdit: doc.uploaderId === session.user.id || session.user.role === 'admin',
  });
}