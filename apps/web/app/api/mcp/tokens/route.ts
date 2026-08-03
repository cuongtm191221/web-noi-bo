import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/mcp-tokens';
import { logActivity } from '@/lib/activity';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokens = await prisma.mcpToken.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  const userId = session.user.id;
  const { plain, hash, prefix } = generateToken(userId);

  const token = await prisma.mcpToken.create({
    data: {
      userId,
      name,
      tokenHash: hash,
      tokenPrefix: prefix,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  void logActivity({
    userId,
    action: 'TOKEN_CREATE',
    entityType: 'token',
    entityId: token.id,
    metadata: { name },
  });

  return NextResponse.json({
    token,
    plain, // Return plain only once
  });
}