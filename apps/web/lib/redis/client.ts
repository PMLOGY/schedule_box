/**
 * Redis client singleton for token blacklist and caching
 * Lazy initialization to avoid connection attempts during next build
 */
import Redis from 'ioredis';

let _redis: Redis | null = null;

function createRedisClient(): Redis {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    reconnectOnError(err) {
      // Reconnect on READONLY errors (e.g., failover)
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    retryStrategy(times) {
      // Exponential backoff with max 3 seconds
      const delay = Math.min(times * 50, 3000);
      return delay;
    },
  });

  // Log connection events in development
  if (process.env.NODE_ENV === 'development') {
    client.on('connect', () => console.log('[Redis] Connected to', REDIS_URL));
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
  }

  return client;
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

// Graceful shutdown
process.on('beforeExit', () => {
  if (_redis) {
    _redis.quit();
  }
});
