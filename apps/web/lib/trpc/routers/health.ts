import { createTRPCRouter, publicProcedure } from '../server';
import { prisma } from '@/lib/prisma';

export const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
});