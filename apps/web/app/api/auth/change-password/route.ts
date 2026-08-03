import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { rateLimit, LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

const MIN_LENGTH = 8;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate-limit per user (prevent brute-force on password change)
  const rl = rateLimit(`change-pw:${session.user.id}`, LIMITS.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const body = await request.json();
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Vui lòng nhập đầy đủ mật khẩu' }, { status: 400 });
  }

  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json({ error: `Mật khẩu mới phải có ít nhất ${MIN_LENGTH} ký tự` }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'Mật khẩu mới phải khác mật khẩu cũ' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User không tồn tại' }, { status: 404 });
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  void logActivity({
    userId: session.user.id,
    action: 'PASSWORD_RESET',
  });

  return NextResponse.json({ success: true });
}