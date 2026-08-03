// In-memory rate limiter (per-user + per-IP)
type Counter = { count: number; resetAt: number };
const buckets = new Map<string, Counter>();

export type RateLimitConfig = {
  windowSec: number;  // Time window in seconds
  maxRequests: number; // Max requests per window
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until reset (only when blocked)
};

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const counter = buckets.get(key);

  if (!counter || counter.resetAt <= now) {
    const resetAt = now + config.windowSec * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: new Date(resetAt) };
  }

  counter.count += 1;
  const allowed = counter.count <= config.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - counter.count),
    resetAt: new Date(counter.resetAt),
    retryAfter: allowed ? undefined : Math.ceil((counter.resetAt - now) / 1000),
  };
}

// Cleanup expired entries every 5 minutes
let cleanupTimer: NodeJS.Timeout | null = null;
export function startRateLimitCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, counter] of buckets.entries()) {
      if (counter.resetAt <= now) buckets.delete(key);
    }
  }, 5 * 60 * 1000);
}

// Preset limits
export const LIMITS = {
  upload: { windowSec: 3600, maxRequests: 50 },        // 50 uploads per hour
  aiProcess: { windowSec: 3600, maxRequests: 100 },    // 100 AI queries per hour
  search: { windowSec: 60, maxRequests: 60 },          // 60 searches per minute
  api: { windowSec: 60, maxRequests: 120 },            // 120 API calls per minute
  auth: { windowSec: 60, maxRequests: 10 },            // 10 auth attempts per minute
  admin: { windowSec: 3600, maxRequests: 30 },         // 30 admin actions per hour
};

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
  };
  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  return headers;
}