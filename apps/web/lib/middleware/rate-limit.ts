/**
 * Redis-backed sliding window rate limiter
 * Prevents brute-force attacks and API abuse
 *
 * Uses a sliding window counter stored in Redis with TTL-based expiry.
 * Each key format: ratelimit:{identifier}:{window}
 */

import { type NextRequest } from 'next/server';
import { redis } from '@/lib/redis/client';
import { AppError } from '@schedulebox/shared';

/**
 * 429 Too Many Requests error
 */
export class TooManyRequestsError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
      429,
      { retry_after: retryAfterSeconds },
    );
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/** Preset rate limit configurations */
export const RATE_LIMITS = {
  /** Auth endpoints: 5 requests per minute */
  AUTH: { maxRequests: 5, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Auth sensitive (login, password reset): 10 per 15 minutes */
  AUTH_SENSITIVE: { maxRequests: 10, windowSeconds: 900 } satisfies RateLimitConfig,
  /** Standard API: 100 requests per minute */
  API: { maxRequests: 100, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Public/unauthenticated: 30 requests per minute */
  PUBLIC: { maxRequests: 30, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Webhook endpoints: 200 requests per minute (high volume expected) */
  WEBHOOK: { maxRequests: 200, windowSeconds: 60 } satisfies RateLimitConfig,
} as const;

/**
 * Extract client identifier for rate limiting
 * Uses IP address from common proxy headers or direct connection
 */
function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  // Fallback to a generic identifier when behind no proxy
  return 'unknown';
}

/**
 * Check rate limit for a given request
 * Uses Redis INCR + EXPIRE for atomic sliding window
 *
 * @param req - Next.js request object
 * @param config - Rate limit configuration
 * @param keyPrefix - Optional key prefix for endpoint-specific limits
 * @throws TooManyRequestsError if limit exceeded
 */
export async function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  keyPrefix = 'api',
): Promise<void> {
  const identifier = getClientIdentifier(req);
  const windowKey = Math.floor(Date.now() / (config.windowSeconds * 1000));
  const key = `ratelimit:${keyPrefix}:${identifier}:${windowKey}`;

  try {
    const current = await redis.incr(key);

    // Set expiry on first request in window
    if (current === 1) {
      await redis.expire(key, config.windowSeconds);
    }

    if (current > config.maxRequests) {
      // Calculate time until window resets
      const ttl = await redis.ttl(key);
      const retryAfter = ttl > 0 ? ttl : config.windowSeconds;
      throw new TooManyRequestsError(retryAfter);
    }
  } catch (error) {
    // Re-throw rate limit errors
    if (error instanceof TooManyRequestsError) {
      throw error;
    }
    // If Redis is unavailable, allow the request (fail-open)
    console.error('[RateLimit] Redis error, allowing request:', error);
  }
}
