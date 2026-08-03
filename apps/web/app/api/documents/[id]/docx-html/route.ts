import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'node:fs/promises';
import mammoth from 'mammoth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { storagePath: true, format: true },
  });
  if (!doc || doc.format !== 'docx') {
    return NextResponse.json({ error: 'Not a DOCX file' }, { status: 400 });
  }

  try {
    const buffer = await readFile(doc.storagePath);
    const result = await mammoth.convertToHtml({ buffer });
    return NextResponse.json({ html: result.value });
  } catch (err) {
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}