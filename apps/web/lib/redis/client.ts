/**
 * Redis client singleton for token blacklist and caching
 * Uses Upstash HTTP transport for Vercel serverless compatibility
 */
import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

function createRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
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
    return Reflect.get(_redis, prop, receiver);
  },
});
