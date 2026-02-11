/**
 * Email Click Tracking Endpoint
 * GET /api/v1/webhooks/email-tracking/click?nid=:notificationId&url=:targetUrl
 *
 * NO AUTH - Public webhook endpoint
 * Tracks link clicks in emails and redirects to target URL
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/v1/webhooks/email-tracking/click
 * Track email link click and redirect to target URL
 *
 * Query params:
 * - nid: notification ID (integer)
 * - url: target URL to redirect to (must start with http:// or https://)
 *
 * Returns 302 redirect to target URL
 * Updates notification status to 'clicked' and sets clickedAt timestamp
 * Only updates on FIRST click (clickedAt IS NULL)
 */
export async function GET(req: NextRequest) {
  // Parse query params
  const nid = req.nextUrl.searchParams.get('nid');
  const url = req.nextUrl.searchParams.get('url');

  // Validate URL to prevent open redirect vulnerability
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return NextResponse.json({ error: 'Invalid or missing URL parameter' }, { status: 400 });
  }

  try {
    if (nid) {
      const notificationId = parseInt(nid, 10);

      if (!isNaN(notificationId)) {
        // Update notification: set status='clicked', clickedAt=now()
        // Only update if clickedAt IS NULL (first click only)
        await db
          .update(notifications)
          .set({
            status: 'clicked',
            clickedAt: new Date(),
          })
          .where(and(eq(notifications.id, notificationId), isNull(notifications.clickedAt)));
      }
    }
  } catch (error) {
    // Log error but still redirect
    console.error('[Email Tracking] Click tracking error:', error);
  }

  // Redirect to target URL (302 temporary redirect)
  return NextResponse.redirect(url, { status: 302 });
}
