import { z } from 'zod';
import { unlink } from 'node:fs/promises';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../server';
import { prisma } from '@/lib/prisma';

export const documentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'published', 'archived']).optional(),
      categoryId: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { status, categoryId, search, limit = 20, cursor } = input ?? {};

      const where = {
        ...(status && { status }),
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { filename: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const documents = await prisma.document.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: { select: { name: true, email: true } },
          category: { select: { name: true, slug: true } },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (documents.length > limit) {
        const next = documents.pop();
        nextCursor = next?.id;
      }

      return {
        documents: documents.map(d => ({
          id: d.id,
          title: d.title,
          filename: d.filename,
          format: d.format,
          sizeBytes: d.sizeBytes,
          status: d.status,
          createdAt: d.createdAt,
          uploader: d.uploader,
          category: d.category,
        })),
        nextCursor,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const doc = await prisma.document.findUnique({
        where: { id: input.id },
        include: {
          uploader: { select: { name: true, email: true } },
          category: true,
        },
      });
      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' });
      }
      return doc;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findUnique({ where: { id: input.id } });
      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Only admin or uploader can delete
      if (ctx.session.user.role !== 'admin' && doc.uploaderId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Delete file from filesystem
      try {
        await unlink(doc.storagePath);
      } catch (err) {
        console.warn('Could not delete file from storage:', err);
      }

      // Delete DB record
      await prisma.document.delete({ where: { id: input.id } });

      return { success: true };
    }),
});
