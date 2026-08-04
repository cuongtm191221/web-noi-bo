import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8765';

async function verifyMcpToken(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const mcpToken = await prisma.mcpToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });

  if (mcpToken) {
    // Update last used
    await prisma.mcpToken.update({
      where: { tokenHash },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});
    return mcpToken.userId;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: null, error: { code: -32602, message: 'Missing Authorization header' } },
        { status: 401 }
      );
    }

    // Verify token
    const userId = await verifyMcpToken(token);
    if (!userId) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: null, error: { code: -32602, message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }

    // Forward to MCP server
    const body = await request.json();
    const mcpResponse = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(body),
    });

    const responseData = await mcpResponse.json();
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('MCP proxy error:', error);
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } },
      { status: 500 }
    );
  }
}
