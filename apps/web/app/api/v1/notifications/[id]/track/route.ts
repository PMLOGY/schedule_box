/**
 * Notification Click Tracking Endpoint
 * GET /api/v1/notifications/:id/track?t={token}&url={targetUrl}
 *
 * Records click event and redirects to the target URL.
 * Public endpoint (no auth) - embedded in notification emails as link wrapper.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { eq, isNull, and } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { verifyTrackingId } from '@/lib/notifications/tracking-utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const token = request.nextUrl.searchParams.get('t');
  const targetUrl = request.nextUrl.searchParams.get('url');

  // Validate target URL to prevent open redirect
  const isValidUrl =
    targetUrl && (targetUrl.startsWith('https://') || targetUrl.startsWith('http://'));

  if (token && isValidUrl) {
    const notificationId = verifyTrackingId(token);
    const routeId = parseInt(idStr, 10);

    // Verify token matches the route param
    if (notificationId && notificationId === routeId) {
      try {
        // Only set clicked_at if not already set (first click wins)
        await db
          .update(notifications)
          .set({ clickedAt: new Date() })
          .where(and(eq(notifications.id, notificationId), isNull(notifications.clickedAt)));
      } catch (error) {
        // Silently fail - don't break the redirect
        console.error('[tracking-click] DB update error:', error);
      }

      return NextResponse.redirect(targetUrl, 302);
    }
  }

  // On invalid token, missing/bad URL: redirect to homepage
  return NextResponse.redirect(new URL('/', request.url), 302);
}
