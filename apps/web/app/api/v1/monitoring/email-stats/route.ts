/**
 * Email Delivery Stats Monitoring Endpoint
 * GET /api/v1/monitoring/email-stats - Email delivery statistics for a configurable time window
 *
 * INTERNAL endpoint — admin role required (settings.manage permission)
 */

import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { z } from 'zod';

const querySchema = z.object({
  window: z.coerce.number().int().min(1).max(1440).default(60),
});

/**
 * GET /api/v1/monitoring/email-stats
 * Returns email delivery statistics from the notifications table.
 *
 * Query params:
 * - window: number of minutes to look back (default: 60, max: 1440)
 *
 * Returns: { delivered, failed, total, bounceRate, windowMinutes, checkedAt }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req }) => {
    // Parse and clamp window query param
    const searchParams = req.nextUrl.searchParams;
    const { window: windowMinutes } = querySchema.parse({
      window: searchParams.get('window') ?? undefined,
    });

    // Query notifications table for email stats in the given time window
    // Uses FILTER (WHERE ...) aggregate syntax for single-pass counting
    const [row] = await db
      .select({
        delivered: sql<number>`COUNT(*) FILTER (WHERE ${notifications.status} IN ('sent', 'delivered', 'opened', 'clicked'))`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${notifications.status} = 'failed')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(notifications)
      .where(
        sql`${notifications.channel} = 'email' AND ${notifications.createdAt} > NOW() - make_interval(mins => ${windowMinutes})`,
      );

    const delivered = Number(row?.delivered ?? 0);
    const failed = Number(row?.failed ?? 0);
    const total = Number(row?.total ?? 0);

    // Bounce rate = failed / (delivered + failed), 0 if no messages
    const bounceRate = delivered + failed > 0 ? failed / (delivered + failed) : 0;

    return NextResponse.json({
      delivered,
      failed,
      total,
      bounceRate,
      windowMinutes,
      checkedAt: new Date().toISOString(),
    });
  },
});
