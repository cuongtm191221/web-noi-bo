import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const outline = await prisma.documentOutline.findUnique({
    where: { documentId: id },
    select: { outlineJson: true },
  });

  if (!outline?.outlineJson) {
    return NextResponse.json({ outline: [] });
  }

  // outlineJson is stored as JSONB (already parsed by Prisma)
  const tree = Array.isArray(outline.outlineJson) ? outline.outlineJson : [];
  return NextResponse.json({ outline: tree });
}