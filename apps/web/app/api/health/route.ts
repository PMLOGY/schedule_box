import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Liveness probe - returns 200 if the service is running.
 * Used by Docker health checks and Kubernetes liveness probes.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok' as const,
      service: 'schedulebox-web',
      version: process.env.APP_VERSION ?? '1.0.0',
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
