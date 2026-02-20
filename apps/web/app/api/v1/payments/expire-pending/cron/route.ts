// Called by external cron service (Railway Cron / cron-job.org) every 5-10 minutes.

/**
 * Cron Payment Expiration Endpoint
 * POST /api/v1/payments/expire-pending/cron
 *
 * Expires pending payments older than the configured timeout.
 * Protected by CRON_SECRET bearer token — no user authentication required.
 * Intended for automated calls from Railway Cron or cron-job.org.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { expirePendingPayments } from '@/app/api/v1/payments/saga/payment-timeout';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Validate CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 });
  }

  // Extract bearer token from Authorization header
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // Use timing-safe comparison to prevent timing attacks
  let isValid = false;
  try {
    const expectedBuffer = Buffer.from(cronSecret, 'utf8');
    const tokenBuffer = Buffer.from(token, 'utf8');
    if (expectedBuffer.length === tokenBuffer.length) {
      isValid = crypto.timingSafeEqual(expectedBuffer, tokenBuffer);
    }
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid cron secret' }, { status: 401 });
  }

  // Execute payment expiration (uses PAYMENT_TIMEOUT_MINUTES env var or defaults to 30)
  try {
    const expiredCount = await expirePendingPayments();
    return NextResponse.json(
      { expired_count: expiredCount, timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    console.error('[Cron] Payment expiration failed:', error);
    return NextResponse.json({ error: 'Payment expiration failed' }, { status: 500 });
  }
}
