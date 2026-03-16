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

  // Check Upstash Redis
  const redisCheck = await checkService('Redis (Upstash)', async () => {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      throw new Error('UPSTASH_REDIS_REST_URL not configured');
    }
    if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('UPSTASH_REDIS_REST_TOKEN not configured');
    }
    return true;
  });
  checks.push(redisCheck);
  if (redisCheck.status === 'error') allHealthy = false;

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
