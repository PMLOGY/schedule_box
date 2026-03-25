/**
 * Redis client singleton — dual-mode:
 *   1. Upstash HTTP transport (Vercel / serverless)
 *   2. Standard TCP via ioredis  (Coolify / Docker / self-hosted)
 *
 * Selection logic:
 *   - If UPSTASH_REDIS_REST_URL + TOKEN are set → Upstash HTTP
 *   - Else if REDIS_URL is set                  → ioredis TCP
 *   - Else in development                       → no-op (rate-limiting disabled)
 *   - Else in production                        → throws
 */
import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';

// Unified interface covering the Redis commands the app actually uses
export interface RedisClient {
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  ttl(key: string): Promise<number>;
  eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
}

let _redis: RedisClient | null = null;
let _isNoOp = false;

/**
 * No-op client for local development when no Redis is configured.
 * Rate limiting, token blacklist, and caching are disabled.
 */
const noOpRedis: RedisClient = new Proxy({} as RedisClient, {
  get(_target, prop) {
    if (typeof prop === 'string' && !['then', 'catch', 'finally'].includes(prop)) {
      return (..._args: unknown[]) => Promise.resolve(null);
    }
    return undefined;
  },
});

/**
 * Adapter that wraps ioredis to match the subset of commands we use,
 * keeping the same return-type contract as @upstash/redis.
 */
function wrapIORedis(client: IORedis): RedisClient {
  return {
    async get<T = string>(key: string): Promise<T | null> {
      const val = await client.get(key);
      return val as T | null;
    },
    async set(key: string, value: string, opts?: { ex?: number }) {
      if (opts?.ex) {
        return client.set(key, value, 'EX', opts.ex);
      }
      return client.set(key, value);
    },
    async del(...keys: string[]) {
      return client.del(...keys);
    },
    async incr(key: string) {
      return client.incr(key);
    },
    async expire(key: string, seconds: number) {
      return client.expire(key, seconds);
    },
    async setex(key: string, seconds: number, value: string) {
      return client.setex(key, seconds, value);
    },
    async ttl(key: string) {
      return client.ttl(key);
    },
    async eval(script: string, keys: string[], args: (string | number)[]) {
      return client.eval(script, keys.length, ...keys, ...args);
    },
  };
}

function createRedisClient(): RedisClient {
  // Option 1: Upstash HTTP (serverless / Vercel)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    console.log('[Redis] Using Upstash HTTP transport');
    // UpstashRedis is API-compatible with our RedisClient interface
    return new UpstashRedis({ url: upstashUrl, token: upstashToken }) as unknown as RedisClient;
  }

  // Option 2: Standard TCP via ioredis (Coolify / Docker / self-hosted)
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    console.log('[Redis] Using ioredis TCP transport');
    const ioClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
    ioClient.connect().catch((err) => {
      console.error('[Redis] TCP connection failed:', err.message);
    });
    return wrapIORedis(ioClient);
  }

  // Option 3: No Redis — no-op in dev, error in production
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.warn('[Redis] No Redis configured — using no-op client (rate limiting disabled)');
    _isNoOp = true;
    return noOpRedis;
  }

  throw new Error(
    'Redis is required in production. Set either UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash HTTP) or REDIS_URL (standard TCP).',
  );
}

/** Lazy Redis instance — created on first property access */
export const redis: RedisClient = new Proxy({} as RedisClient, {
  get(_target, prop, receiver) {
    if (!_redis) {
      _redis = createRedisClient();
    }
    return Reflect.get(_redis, prop, receiver);
  },
});

/** Whether the current Redis client is a no-op (dev without config) */
export function isRedisNoOp(): boolean {
  return _isNoOp;
}
