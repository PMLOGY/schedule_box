/**
 * Email Open Tracking Endpoint
 * GET /api/v1/webhooks/email-tracking/open?nid=:notificationId
 *
 * NO AUTH - Public webhook endpoint
 * Embedded as tracking pixel in emails to track first open
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * 1x1 transparent PNG base64
 * Ultra-minimal transparent pixel for tracking
 */
const TRACKING_PIXEL_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * GET /api/v1/webhooks/email-tracking/open
 * Track email open via 1x1 transparent pixel
 *
 * Query params:
 * - nid: notification ID (integer)
 *
 * Returns 1x1 transparent PNG regardless of success/failure
 * Updates notification status to 'opened' and sets openedAt timestamp
 * Only updates on FIRST open (openedAt IS NULL)
 */
export async function GET(req: NextRequest) {
  try {
    // Parse notification ID from query params
    const nid = req.nextUrl.searchParams.get('nid');

    if (nid) {
      const notificationId = parseInt(nid, 10);

      if (!isNaN(notificationId)) {
        // Update notification: set status='opened', openedAt=now()
        // Only update if openedAt IS NULL (first open only)
        await db
          .update(notifications)
          .set({
            status: 'opened',
            openedAt: new Date(),
          })
          .where(and(eq(notifications.id, notificationId), isNull(notifications.openedAt)));
      }
    }
  } catch (error) {
    // Silently fail - always return tracking pixel
    console.error('[Email Tracking] Open tracking error:', error);
  }

  // Always return 1x1 transparent PNG
  const pixelBuffer = Buffer.from(TRACKING_PIXEL_BASE64, 'base64');

  return new NextResponse(pixelBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
