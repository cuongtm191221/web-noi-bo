import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, 'a')
    .replace(/[éèẻẽẹêếềểễệ]/g, 'e')
    .replace(/[íìỉĩị]/g, 'i')
    .replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o')
    .replace(/[úùủũụưứừửữự]/g, 'u')
    .replace(/[ýỳỷỹỵ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      icon: true,
      parentId: true,
      _count: { select: { documents: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const color = typeof body.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color)
    ? body.color
    : '#005c9e';
  const icon = typeof body.icon === 'string' ? body.icon.trim() || null : null;
  const parentId = typeof body.parentId === 'string' ? body.parentId : null;

  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }

  let slug = slugify(name);
  let counter = 1;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${slugify(name)}-${counter++}`;
  }

  const category = await prisma.category.create({
    data: { name, slug, color, icon, parentId },
    select: { id: true, name: true, slug: true, color: true, icon: true },
  });

  return NextResponse.json({ category });
}