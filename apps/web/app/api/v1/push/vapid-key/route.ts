/**
 * VAPID Public Key Endpoint
 * GET /api/v1/push/vapid-key - Return VAPID public key for client-side subscription
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/v1/push/vapid-key
 * Public endpoint (no auth required) — returns the VAPID public key
 * needed by the browser to subscribe to push notifications.
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 500 });
  }

  return NextResponse.json({ publicKey });
}
