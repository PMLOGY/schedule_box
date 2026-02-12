/**
 * Prometheus metrics scrape endpoint
 *
 * Returns metrics in Prometheus text exposition format.
 * This endpoint is unauthenticated to allow Prometheus scraper access.
 *
 * PRODUCTION NOTE: In production, restrict this endpoint via Kubernetes
 * NetworkPolicy to allow access only from the monitoring namespace.
 */

import { NextResponse } from 'next/server';
import { getMetrics } from '@schedulebox/shared/metrics';
import { startEventLoopMetrics } from '@schedulebox/shared/metrics/event-loop';

// Start event loop metrics collection when route module loads
// (runs once per worker process)
startEventLoopMetrics();

/**
 * GET /api/metrics
 * Returns Prometheus metrics in text exposition format
 */
export async function GET(): Promise<NextResponse> {
  try {
    const metrics = await getMetrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Failed to generate metrics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
