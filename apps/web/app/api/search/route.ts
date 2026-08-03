import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit, LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 60 searches per minute per user
  const rl = rateLimit(`search:${session.user.id}`, LIMITS.search);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Quá nhiều truy vấn. Thử lại sau ít giây.' },
      { status: 429, headers: getRateLimitHeaders(rl) },
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const categoryId = url.searchParams.get('category') ?? '';
  const format = url.searchParams.get('format') ?? '';
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));

  if (!q) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const where: Record<string, unknown> = {
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { filename: { contains: q, mode: 'insensitive' } },
    ],
  };
  if (categoryId) where.categoryId = categoryId;
  if (format) where.format = format;

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: { select: { name: true } },
        category: { select: { name: true, color: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);

  // Snippet: trích 200 chars từ description hoặc filename
  const snippet = (text: string, query: string): string => {
    if (!text) return '';
    const lower = text.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return text.slice(0, 200);
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + query.length + 140);
    return (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
  };

  const results = documents.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    filename: d.filename,
    format: d.format,
    sizeBytes: d.sizeBytes,
    category: d.category,
    uploader: d.uploader,
    createdAt: d.createdAt.toISOString(),
    snippet: snippet(d.description || d.filename, q),
  }));

  return NextResponse.json({ results, total });
}