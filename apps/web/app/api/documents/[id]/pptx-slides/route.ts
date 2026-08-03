import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

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
  if (!doc || doc.format !== 'pptx') {
    return NextResponse.json({ error: 'Not a PPTX file' }, { status: 400 });
  }

  try {
    const buffer = await readFile(doc.storagePath);
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort();

    const slides = await Promise.all(
      slideFiles.map(async (name, idx) => {
        const file = zip.files[name];
        if (!file) return { slideNumber: idx + 1, text: '' };
        const content = await file.async('text');
        const texts = content.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
        const text = texts
          .map((t) => t.replace(/<[^>]+>/g, ''))
          .join('\n');
        return { slideNumber: idx + 1, text };
      }),
    );

    return NextResponse.json({ slides });
  } catch (err) {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
}