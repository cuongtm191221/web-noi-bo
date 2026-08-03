import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/notification';

// Internal callback from AI pipeline (no auth required, IP-restricted in prod)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { status, summary_length, error } = body;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true, uploaderId: true, status: true },
  });
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (status === 'completed' || status === 'failed') {
    const newStatus = status === 'completed' ? 'published' as const : 'failed' as const;
    await prisma.document.update({
      where: { id },
      data: { status: newStatus },
    });

    if (status === 'completed') {
      await notify({
        userId: doc.uploaderId,
        type: 'AI_DONE',
        title: 'AI xử lý xong',
        message: `${doc.title} đã có summary và outline.`,
        link: `/documents/${doc.id}`,
      });
    } else {
      await notify({
        userId: doc.uploaderId,
        type: 'AI_FAILED',
        title: 'AI xử lý thất bại',
        message: `${doc.title}: ${error || 'Lỗi không xác định'}`,
        link: `/documents/${doc.id}`,
      });
    }
  }

  return NextResponse.json({ success: true });
}