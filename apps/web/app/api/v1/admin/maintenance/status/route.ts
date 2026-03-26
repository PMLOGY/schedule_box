import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis/client';

/**
 * GET /api/v1/admin/maintenance/status
 *
 * Lightweight, unauthenticated endpoint for the Edge middleware
 * to check maintenance mode when using standard Redis (not Upstash HTTP).
 *
 * Only responds to internal requests (x-internal-check header).
 */
export async function GET(req: Request) {
  if (req.headers.get('x-internal-check') !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const enabled = await redis.get<string>('maintenance:enabled');
    return NextResponse.json({ enabled: enabled === 'true' });
  } catch {
    // Redis unavailable — report not in maintenance
    return NextResponse.json({ enabled: false });
  }
}
