// Next.js instrumentation hook (runs once at server startup)
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Responsibilities:
// 1. Validate required env vars (fail fast in production if missing)
// 2. Start in-memory rate-limit cleanup interval

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 1. Validate env (throws if invalid)
    try {
      // Dynamic import — env.ts uses zod and runs at module load
      await import('./lib/env');
      console.log('[instrumentation] env validated ok');
    } catch (e) {
      console.error('[instrumentation] env validation failed', e);
      throw e;
    }

    // 2. Start rate-limit cleanup (prevents memory leak)
    try {
      const { startRateLimitCleanup } = await import('./lib/rate-limit');
      startRateLimitCleanup();
      console.log('[instrumentation] rate-limit cleanup started');
    } catch (e) {
      console.error('[instrumentation] rate-limit cleanup failed to start', e);
    }
  }
}