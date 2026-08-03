import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  try {
    const stat = statSync(doc.storagePath);
    const fileSize = stat.size;

    // Stream file directly to response without buffering in memory
    // This avoids loading a 50MB file into RAM before sending
    const nodeStream = createReadStream(doc.storagePath);
    // Convert Node ReadableStream to Web ReadableStream for NextResponse
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.filename)}"`,
        'Content-Length': String(fileSize),
        'Cache-Control': 'private, max-age=0',
      },
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json({ error: 'File not found on disk' }, { status: 500 });
  }
}