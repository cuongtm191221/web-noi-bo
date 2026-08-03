import { NextRequest, NextResponse } from 'next/server';
import { promises as fs, createReadStream } from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';

const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name } = await params;

  // Validate: only allow backup_<timestamp>_<type>.ext
  if (!/^backup_\d{8}_\d{6}_(postgres\.json\.gz|uploads\.tar\.gz|meta\.json)$/.test(name)) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const filePath = path.join(BACKUP_DIR, name);
  try {
    await fs.access(filePath);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = await fs.readFile(filePath);
  const mime = name.endsWith('.gz')
    ? 'application/gzip'
    : 'application/json';

  return new NextResponse(data, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Content-Length': String(data.length),
    },
  });
}