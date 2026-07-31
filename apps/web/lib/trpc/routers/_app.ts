import { createTRPCRouter } from '../server';
import { healthRouter } from './health';
import { authRouter } from './auth';

export const appRouter = createTRPCRouter({
  health: healthRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;