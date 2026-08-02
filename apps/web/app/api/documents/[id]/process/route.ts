import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const aiPipelineUrl = process.env.AI_PIPELINE_URL ?? 'http://ai-pipeline:8000';

  try {
    await fetch(`${aiPipelineUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: doc.id,
        storage_path: doc.storagePath,
        format: doc.format,
      }),
    });
    return NextResponse.json({ status: 'processing' });
  } catch (err) {
    return NextResponse.json(
      { error: 'AI pipeline unavailable' },
      { status: 503 },
    );
  }
}