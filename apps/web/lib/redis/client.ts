/**
 * Redis client singleton for token blacklist and caching
 * Uses Upstash HTTP transport on Vercel, falls back to no-op in local dev
 */
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
let _isNoOp = false;

/**
 * No-op Redis client for local development when Upstash is not configured.
 * Rate limiting, token blacklist, and usage metering are disabled in dev.
 */
const noOpRedis = new Proxy({} as Redis, {
  get(_target, prop) {
    // Return async no-op functions for all Redis commands
    if (typeof prop === 'string' && !['then', 'catch', 'finally'].includes(prop)) {
      return (..._args: unknown[]) => Promise.resolve(null);
    }
    return undefined;
  },
});

function createRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Redis] No Upstash credentials — using no-op client (rate limiting disabled)');
      _isNoOp = true;
      return noOpRedis;
    }
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required',
    );
  }

  return new Redis({ url, token });
}

// Lazy Redis instance — created on first access
export const redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    if (!_redis) {
      _redis = createRedisClient();
    }
    if (_isNoOp) {
      return Reflect.get(_redis, prop, receiver);
    }
    return Reflect.get(_redis, prop, receiver);
  },
});
