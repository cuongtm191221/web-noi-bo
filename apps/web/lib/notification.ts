import { prisma } from './prisma';

export type NotificationType =
  | 'UPLOAD_DONE'
  | 'AI_DONE'
  | 'AI_FAILED'
  | 'DOC_DELETED'
  | 'USER_CREATED';

export async function notify({
  userId,
  type,
  title,
  message,
  link,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, link },
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}