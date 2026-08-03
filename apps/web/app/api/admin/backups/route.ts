import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';

type BackupInfo = {
  name: string;
  timestamp: string;
  hasPostgres: boolean;
  hasUploads: boolean;
  postgresSize?: number;
  uploadsSize?: number;
  metadata?: Record<string, unknown>;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = new Map<string, BackupInfo>();

    console.log(`[backups] Files in ${BACKUP_DIR}:`, files);

    for (const file of files) {
      const match = file.match(/^backup_(\d{8}_?\d{6})_(postgres\.json\.gz|uploads\.tar\.gz|meta\.json|postgres\.sql)$/);
      console.log(`[backups] file=${file} match=${match ? 'YES' : 'NO'}`);
      if (!match) continue;
      const rawTs = match[1] ?? '';
      const timestamp = rawTs.includes('_') ? rawTs : `${rawTs.slice(0, 8)}_${rawTs.slice(8)}`;
      const type = match[2] ?? '';
      const baseName = `backup_${timestamp}`;

      if (!backups.has(baseName)) {
        backups.set(baseName, {
          name: baseName,
          timestamp,
          hasPostgres: false,
          hasUploads: false,
        });
      }

      const info = backups.get(baseName)!;
      const fullPath = path.join(BACKUP_DIR, file);
      const stat = await fs.stat(fullPath);

      if (type === 'postgres.json.gz') {
        info.hasPostgres = true;
        info.postgresSize = stat.size;
      } else if (type === 'uploads.tar.gz') {
        info.hasUploads = true;
        info.uploadsSize = stat.size;
      } else if (type === 'meta.json') {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          info.metadata = JSON.parse(content);
        } catch {}
      }
    }

    return NextResponse.json({
      backups: Array.from(backups.values()).sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp),
      ),
    });
  } catch (err) {
    return NextResponse.json({
      backups: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action ?? 'create';

  if (action === 'create') {
    const { exec } = await import('child_process');
    const scriptPath = '/app/scripts/backup.js';

    if (!existsSync(scriptPath)) {
      return NextResponse.json(
        { error: `Backup script not found: ${scriptPath}` },
        { status: 500 },
      );
    }

    const child = exec(`node ${scriptPath} 30`);
    child.stdout?.on('data', (d) => process.stdout.write(`[backup] ${d}`));
    child.stderr?.on('data', (d) => process.stderr.write(`[backup] ${d}`));
    child.unref();

    void logActivity({
      userId: session.user.id,
      action: 'BACKUP_CREATE',
    });

    return NextResponse.json({ success: true, message: 'Backup started' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}