/**
 * SMS Delivery Stats Monitoring Endpoint
 * GET /api/v1/monitoring/sms-stats - SMS delivery statistics for the current calendar month
 *
 * INTERNAL endpoint — admin role required (settings.manage permission)
 */

import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';

/**
 * GET /api/v1/monitoring/sms-stats
 * Returns SMS delivery statistics for the current calendar month.
 *
 * Segment count is tracked precisely in the notification worker via prom-client.
 * This endpoint uses sent * 1.5 as a rough estimate (avg 1.5 segments per Czech UCS-2 SMS).
 *
 * Returns: { sent, failed, total, estimatedCostCzk, monthlyLimitCzk, percentOfLimit, month }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async () => {
    // Read cost config from env (with safe defaults)
    const costPerSegment = parseFloat(process.env.SMS_COST_PER_SEGMENT_CZK ?? '1.50');
    const monthlyLimit = parseFloat(process.env.SMS_MONTHLY_COST_LIMIT_CZK ?? '5000');

    // Query notifications table for SMS stats in current calendar month
    const [row] = await db
      .select({
        sent: sql<number>`COUNT(*) FILTER (WHERE ${notifications.status} IN ('sent', 'delivered'))`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${notifications.status} = 'failed')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(notifications)
      .where(
        sql`${notifications.channel} = 'sms' AND ${notifications.createdAt} > date_trunc('month', NOW())`,
      );

    const sent = Number(row?.sent ?? 0);
    const failed = Number(row?.failed ?? 0);
    const total = Number(row?.total ?? 0);

    // Rough segment estimate: average 1.5 segments per Czech UCS-2 SMS
    const estimatedCostCzk = sent * 1.5 * costPerSegment;
    const percentOfLimit = monthlyLimit > 0 ? (estimatedCostCzk / monthlyLimit) * 100 : 0;

    return NextResponse.json({
      sent,
      failed,
      total,
      estimatedCostCzk,
      monthlyLimitCzk: monthlyLimit,
      percentOfLimit,
      month: new Date().toISOString().slice(0, 7),
    });
  },
});
