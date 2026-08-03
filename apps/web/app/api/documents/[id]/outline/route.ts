import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const flowchart = await prisma.documentFlowchart.findUnique({
    where: { documentId: id },
    select: { mermaidSyntax: true },
  });

  if (!flowchart?.mermaidSyntax) {
    return NextResponse.json({ outline: [] });
  }

  // mermaidSyntax field now stores JSON outline tree
  try {
    const outline = JSON.parse(flowchart.mermaidSyntax);
    return NextResponse.json({ outline });
  } catch {
    return NextResponse.json({ outline: [] });
  }
}