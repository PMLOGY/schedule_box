/**
 * Notification Open Tracking Pixel
 * GET /api/v1/notifications/track/pixel?t={token}
 *
 * Returns a 1x1 transparent GIF and records the open event.
 * Public endpoint (no auth) - embedded in notification emails.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { eq, isNull, and } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { verifyTrackingId } from '@/lib/notifications/tracking-utils';

/** 1x1 transparent GIF as a Buffer */
const TRACKING_PIXEL = Buffer.from(
  '47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b',
  'hex',
);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');

  if (token) {
    const notificationId = verifyTrackingId(token);

    if (notificationId) {
      try {
        // Only set opened_at if not already set (first open wins)
        await db
          .update(notifications)
          .set({ openedAt: new Date() })
          .where(and(eq(notifications.id, notificationId), isNull(notifications.openedAt)));
      } catch (error) {
        // Silently fail - don't break the pixel response
        console.error('[tracking-pixel] DB update error:', error);
      }
    }
  }

  // Always return the GIF regardless of token validity
  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache',
      'Content-Length': String(TRACKING_PIXEL.length),
    },
  });
}
