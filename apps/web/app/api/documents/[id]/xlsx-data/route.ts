import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

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
  if (!doc || doc.format !== 'xlsx') {
    return NextResponse.json({ error: 'Not an XLSX file' }, { status: 400 });
  }

  try {
    const buffer = await readFile(doc.storagePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      if (!sheet) return { name, data: [] };
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
      return { name, data };
    });

    return NextResponse.json({ sheets });
  } catch (err) {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
}