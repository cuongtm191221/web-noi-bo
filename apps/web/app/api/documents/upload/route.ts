import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateFileSize, validateFileType } from '@/lib/document-helpers';

const UPLOADS_DIR = path.join(process.cwd(), 'apps', 'web', 'uploads');

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'admin' && role !== 'editor') {
    return NextResponse.json(
      { error: 'Forbidden: chỉ admin/editor mới được upload' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const categoryId = formData.get('categoryId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate
    validateFileSize(buffer.length);
    const { format, mimeType } = await validateFileType(buffer, file.name);

    // Ensure uploads directory exists
    await mkdir(UPLOADS_DIR, { recursive: true });

    // Create DB record first (to get document ID)
    const document = await prisma.document.create({
      data: {
        title,
        filename: file.name,
        format,
        mimeType,
        sizeBytes: buffer.length,
        storagePath: '', // Will update after we know the ID
        uploaderId: session.user.id,
        categoryId: categoryId || null,
        status: 'draft',
      },
    });

    // Save file using document ID (path traversal safe)
    const ext = file.name.split('.').pop();
    const storageFilename = `${document.id}.${ext}`;
    const storagePath = path.join(UPLOADS_DIR, storageFilename);

    await writeFile(storagePath, buffer);

    // Update with actual storage path
    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { storagePath },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      format: updated.format,
      sizeBytes: updated.sizeBytes,
      status: updated.status,
      createdAt: updated.createdAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
