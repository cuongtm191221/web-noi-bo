import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const token = await prisma.mcpToken.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!token || token.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.mcpToken.delete({ where: { id } });

  void logActivity({
    userId: session.user.id,
    action: 'TOKEN_REVOKE',
    entityType: 'token',
    entityId: id,
  });

  return NextResponse.json({ success: true });
}