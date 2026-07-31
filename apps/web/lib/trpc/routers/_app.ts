import { createTRPCRouter } from '../server';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { documentsRouter } from './documents';

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
  documents: documentsRouter,
});

export type AppRouter = typeof appRouter;