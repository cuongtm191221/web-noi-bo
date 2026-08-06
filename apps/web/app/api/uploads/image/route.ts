import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { auth } from '@/lib/auth';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'apps', 'web', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);
const ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);

/**
 * POST /api/uploads/image
 * Upload an image for use in flowchart nodes.
 * Returns: { url, width, height, size }
 *
 * Stores at /uploads/flowchart-images/{cuid}.{ext}
 * URL is relative (/uploads/flowchart-images/abc.png) for browser access.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Optional: rate limit (reuse upload limit since this is also a write op)
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME
    if (!ALLOWED_MIMES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${file.type}. Allowed: png, jpg, gif, webp` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Image too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 5MB.` },
        { status: 400 }
      );
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported extension: .${ext}` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const cuid = crypto.randomBytes(12).toString('hex');
    const filename = `${cuid}.${ext}`;
    const subdir = path.join(UPLOADS_DIR, 'flowchart-images');
    const filepath = path.join(subdir, filename);

    // Ensure subdir exists
    await mkdir(subdir, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // URL path (relative for browser, served by Next.js)
    const url = `/uploads/flowchart-images/${filename}`;

    return NextResponse.json({
      url,
      size: file.size,
      mime: file.type,
      filename,
    });
  } catch (e) {
    console.error('Image upload error:', e);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * Optional config for App Router route
 */
export const runtime = 'nodejs';
