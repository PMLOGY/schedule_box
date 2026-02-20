/**
 * Webhook Processing Stats Monitoring Endpoint
 * GET /api/v1/monitoring/webhook-stats - Webhook processing statistics for a configurable time window
 *
 * INTERNAL endpoint — admin role required (settings.manage permission)
 */

import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, processedWebhooks } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { z } from 'zod';

const querySchema = z.object({
  window: z.coerce.number().int().min(1).max(1440).default(60),
});

/**
 * GET /api/v1/monitoring/webhook-stats
 * Returns webhook processing statistics from the processed_webhooks table.
 * "Stuck" = webhooks still in 'processing' state for more than 5 minutes.
 *
 * Query params:
 * - window: number of minutes to look back (default: 60, max: 1440)
 *
 * Returns: { completed, failed, stuck, total, windowMinutes, checkedAt }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req }) => {
    // Parse and clamp window query param
    const searchParams = req.nextUrl.searchParams;
    const { window: windowMinutes } = querySchema.parse({
      window: searchParams.get('window'),
    });

    // Query processed_webhooks table for stats in the given time window
    // Stuck = still 'processing' AND processed_at older than 5 minutes (likely hung)
    const [row] = await db
      .select({
        completed: sql<number>`COUNT(*) FILTER (WHERE ${processedWebhooks.status} = 'completed')`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${processedWebhooks.status} = 'failed')`,
        stuck: sql<number>`COUNT(*) FILTER (WHERE ${processedWebhooks.status} = 'processing' AND ${processedWebhooks.processedAt} < NOW() - INTERVAL '5 minutes')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(processedWebhooks)
      .where(
        sql`${processedWebhooks.processedAt} > NOW() - make_interval(mins => ${windowMinutes})`,
      );

    const completed = Number(row?.completed ?? 0);
    const failed = Number(row?.failed ?? 0);
    const stuck = Number(row?.stuck ?? 0);
    const total = Number(row?.total ?? 0);

    return NextResponse.json({
      completed,
      failed,
      stuck,
      total,
      windowMinutes,
      checkedAt: new Date().toISOString(),
    });
  },
});
