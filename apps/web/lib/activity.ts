import { prisma } from './prisma';

export type ActivityAction =
  | 'UPLOAD'
  | 'VIEW'
  | 'EDIT'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'TOKEN_CREATE'
  | 'TOKEN_REVOKE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DEACTIVATE'
  | 'USER_REACTIVATE'
  | 'PASSWORD_RESET'
  | 'BACKUP_CREATE';

export type EntityType = 'document' | 'user' | 'token' | 'category' | 'session';

export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  userId: string;
  action: ActivityAction;
  entityType?: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.activity.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
    // Don't throw — logging should not break the main flow
  }
}