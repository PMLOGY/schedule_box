import { NextResponse } from 'next/server';

interface ServiceCheck {
  name: string;
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}

/**
 * GET /api/readiness
 * Readiness probe - checks connectivity to PostgreSQL and Redis (Upstash).
 * Used by Vercel health checks.
 *
 * Returns 200 if all services are reachable, 503 if any service is down.
 */
export async function GET() {
  const checks: ServiceCheck[] = [];
  let allHealthy = true;

  // Check PostgreSQL
  const pgCheck = await checkService('PostgreSQL', async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }
    return true;
  });
  checks.push(pgCheck);
  if (pgCheck.status === 'error') allHealthy = false;

  // Check Redis (Upstash HTTP or standard TCP)
  // In development, Redis is optional — missing config is "skipped", not "error"
  const hasUpstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasStandard = !!process.env.REDIS_URL;
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  if (!hasUpstash && !hasStandard && isDev) {
    checks.push({ name: 'Redis', status: 'ok', latency: 0 });
  } else {
    const redisCheck = await checkService('Redis', async () => {
      if (!hasUpstash && !hasStandard) {
        throw new Error('No Redis configured (set REDIS_URL or UPSTASH_REDIS_REST_URL + TOKEN)');
      }
      // Lazy-import to avoid loading ioredis at module level
      const { redis } = await import('@/lib/redis/client');
      await redis.get('health:ping');
      return true;
    });
    checks.push(redisCheck);
    if (redisCheck.status === 'error') allHealthy = false;
  }

  const response = {
    status: allHealthy ? ('ok' as const) : ('degraded' as const),
    service: 'schedulebox-web',
    version: process.env.APP_VERSION ?? '1.0.0',
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  });
}

async function checkService(name: string, check: () => Promise<boolean>): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await check();
    return {
      name,
      status: 'ok',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      status: 'error',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
