/**
 * Platform Metrics API
 * GET /api/v1/admin/metrics
 *
 * Returns combined business KPIs and operational health data.
 * Also stores a daily snapshot in platformDailyMetrics (one row per metric per day).
 *
 * Authorization: admin role only.
 *
 * Business KPIs (computed live from DB):
 *   - newSignupsToday, newSignupsThisWeek
 *   - totalActiveCompanies
 *   - totalBookingsThisWeek
 *   - mrr (sum of active subscription prices)
 *   - churnRate (approximate: cancellations this month / total companies at start of month)
 *
 * Operational health:
 *   - notificationDeliveryRate (last 24h)
 *   - smsDeliveryRate (last 24h)
 *   - failedPaymentsToday
 *   - apiErrorRate (placeholder 0.0 — requires Sentry, Phase 49)
 */

import { sql } from 'drizzle-orm';
import {
  db,
  companies,
  bookings,
  notifications,
  payments,
  subscriptions,
  platformDailyMetrics,
} from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@schedulebox/shared';

export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Start-of-month for churn calculation
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Convert to ISO strings for safe SQL interpolation (Drizzle sql`` requires string/number, not Date)
    const todayStartISO = todayStart.toISOString();
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();
    const monthStartISO = monthStart.toISOString();

    // ---------------------------------------------------------------------------
    // Business KPIs
    // ---------------------------------------------------------------------------

    const [newSignupsTodayRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(sql`${companies.createdAt} >= ${todayStartISO}`);

    const [newSignupsWeekRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(sql`${companies.createdAt} >= ${sevenDaysAgoISO}`);

    const [activeCompaniesRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(sql`${companies.isActive} = true AND ${companies.suspendedAt} IS NULL`);

    const [bookingsWeekRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(sql`${bookings.createdAt} >= ${sevenDaysAgoISO}`);

    // MRR: sum of priceAmount for active subscriptions (monthly basis)
    // Annual subscriptions are divided by 12 for monthly equivalent
    const [mrrRow] = await db
      .select({
        mrr: sql<string>`
          COALESCE(
            SUM(
              CASE
                WHEN ${subscriptions.billingCycle} = 'annual'
                  THEN ${subscriptions.priceAmount}::numeric / 12
                ELSE ${subscriptions.priceAmount}::numeric
              END
            ),
            0
          )
        `,
      })
      .from(subscriptions)
      .where(sql`${subscriptions.status} IN ('active', 'trialing')`);

    // Churn rate: companies deactivated (suspendedAt set) this month / total companies at month start
    const [churnsThisMonthRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(sql`${companies.suspendedAt} >= ${monthStartISO}`);

    const [totalAtMonthStartRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(sql`${companies.createdAt} < ${monthStartISO}`);

    const churns = churnsThisMonthRow?.count ?? 0;
    const totalAtMonthStart = totalAtMonthStartRow?.count ?? 1; // avoid /0
    const churnRate = totalAtMonthStart > 0 ? (churns / totalAtMonthStart) * 100 : 0;

    // ---------------------------------------------------------------------------
    // Operational health
    // ---------------------------------------------------------------------------

    // Notification delivery rate (last 24h): sent / total
    const [notifTotalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(sql`${notifications.createdAt} >= ${twentyFourHoursAgoISO}`);

    const [notifSentRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        sql`${notifications.createdAt} >= ${twentyFourHoursAgoISO} AND ${notifications.status} = 'sent'`,
      );

    const notifTotal = notifTotalRow?.count ?? 0;
    const notifSent = notifSentRow?.count ?? 0;
    const notificationDeliveryRate =
      notifTotal > 0 ? Math.round((notifSent / notifTotal) * 100 * 10) / 10 : 100;

    // SMS delivery rate (last 24h)
    const [smsTotalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        sql`${notifications.createdAt} >= ${twentyFourHoursAgoISO} AND ${notifications.channel} = 'sms'`,
      );

    const [smsSentRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        sql`${notifications.createdAt} >= ${twentyFourHoursAgoISO} AND ${notifications.channel} = 'sms' AND ${notifications.status} = 'sent'`,
      );

    const smsTotal = smsTotalRow?.count ?? 0;
    const smsSent = smsSentRow?.count ?? 0;
    const smsDeliveryRate = smsTotal > 0 ? Math.round((smsSent / smsTotal) * 100 * 10) / 10 : 100;

    // Failed payments today
    const [failedPaymentsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(sql`${payments.createdAt} >= ${todayStartISO} AND ${payments.status} = 'failed'`);

    const kpis = {
      newSignupsToday: newSignupsTodayRow?.count ?? 0,
      newSignupsThisWeek: newSignupsWeekRow?.count ?? 0,
      totalActiveCompanies: activeCompaniesRow?.count ?? 0,
      totalBookingsThisWeek: bookingsWeekRow?.count ?? 0,
      mrr: Math.round(parseFloat(mrrRow?.mrr ?? '0')),
      churnRate: Math.round(churnRate * 10) / 10,
    };

    const health = {
      notificationDeliveryRate,
      smsDeliveryRate,
      failedPaymentsToday: failedPaymentsRow?.count ?? 0,
      apiErrorRate: null as null, // TODO Phase 49: Sentry integration
    };

    // ---------------------------------------------------------------------------
    // Store daily snapshot (idempotent: unique constraint on date + metric_name)
    // ---------------------------------------------------------------------------

    const todayDateOnly = new Date(todayStart);
    const snapshotData = { ...kpis, ...health };

    for (const [metricName, metricValue] of Object.entries(snapshotData)) {
      try {
        await db
          .insert(platformDailyMetrics)
          .values({
            date: todayDateOnly,
            metricName,
            metricValue: { value: metricValue } as Record<string, unknown>,
          })
          .onConflictDoNothing();
      } catch {
        // Snapshot failure must not fail the metrics response
        console.warn(`[Metrics] Failed to store daily snapshot for metric: ${metricName}`);
      }
    }

    return successResponse({ kpis, health, asOf: now.toISOString() });
  },
});
