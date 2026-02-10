/**
 * Redis client singleton for token blacklist and caching
 */
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton Redis instance with reconnection strategy
export const redis = new Redis(REDIS_URL, {
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

// Graceful shutdown
process.on('beforeExit', () => {
  redis.quit();
});

// Log connection events in development
if (process.env.NODE_ENV === 'development') {
  redis.on('connect', () => console.log('[Redis] Connected to', REDIS_URL));
  redis.on('error', (err) => console.error('[Redis] Error:', err.message));
}
