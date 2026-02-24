/**
 * Platform Admin SaaS Health Metrics API
 * GET /api/v1/admin/analytics - Platform-level metrics for admin dashboard
 *
 * ANLYT-06: MRR, churn rate, plan distribution, active companies, signup trends.
 * This route is cross-tenant (no company scope) and requires admin role.
 */

import { eq, sql, gte, and } from 'drizzle-orm';
import { db, companies, subscriptions, subscriptionEvents } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@schedulebox/shared';
import { z } from 'zod';

// Query parameter validation
const adminAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/v1/admin/analytics
 *
 * Returns platform SaaS health metrics:
 * - MRR / ARR (Monthly/Annual Recurring Revenue)
 * - Churn rate for the period
 * - Active and total company counts
 * - Plan distribution with percentages
 * - Daily signup trend
 * - MRR breakdown by plan
 *
 * Authorization: admin role only (403 for non-admin)
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ req, user }) => {
    // Enforce admin-only access (no RBAC permission — direct role check)
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Parse query params
    const query = validateQuery(adminAnalyticsQuerySchema, req);
    const days = query.days ?? 30;

    // Calculate date boundary
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // ---- MRR Calculation ----
    // Monthly subscriptions: SUM(priceAmount)
    // Annual subscriptions: SUM(priceAmount / 12)
    const [mrrData] = await db
      .select({
        monthlyMrr: sql<number>`COALESCE(SUM(
          CASE WHEN ${subscriptions.billingCycle} = 'monthly'
            THEN ${subscriptions.priceAmount}::numeric
            ELSE 0
          END
        ), 0)`,
        annualMrr: sql<number>`COALESCE(SUM(
          CASE WHEN ${subscriptions.billingCycle} = 'annual'
            THEN ${subscriptions.priceAmount}::numeric / 12
            ELSE 0
          END
        ), 0)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const mrr = Number(mrrData.monthlyMrr) + Number(mrrData.annualMrr);
    const arr = mrr * 12;

    // ---- Churn Rate ----
    // Count subscriptions that transitioned to expired or cancelled in the period
    const [churnData] = await db
      .select({
        churned: sql<number>`COUNT(DISTINCT ${subscriptionEvents.subscriptionId})`,
      })
      .from(subscriptionEvents)
      .where(
        and(
          sql`(${subscriptionEvents.eventType} LIKE '%expired%' OR ${subscriptionEvents.eventType} LIKE '%cancelled%')`,
          gte(subscriptionEvents.createdAt, daysAgo),
        ),
      );

    const churnedCount = Number(churnData.churned);

    // Count active subscriptions (approximate period start = current active + churned)
    const [activeSubData] = await db
      .select({
        activeCount: sql<number>`COUNT(*)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    const activeSubCount = Number(activeSubData.activeCount);
    const periodStartActive = activeSubCount + churnedCount;
    const churnRate = periodStartActive > 0 ? (churnedCount / periodStartActive) * 100 : 0;

    // ---- Company Counts ----
    const [companyCounts] = await db
      .select({
        activeCompanies: sql<number>`COUNT(*) FILTER (WHERE ${companies.isActive} = true)`,
        totalCompanies: sql<number>`COUNT(*)`,
      })
      .from(companies);

    const activeCompanies = Number(companyCounts.activeCompanies);
    const totalCompanies = Number(companyCounts.totalCompanies);

    // ---- Plan Distribution ----
    const planDistRows = await db
      .select({
        plan: companies.subscriptionPlan,
        count: sql<number>`COUNT(*)`,
      })
      .from(companies)
      .where(eq(companies.isActive, true))
      .groupBy(companies.subscriptionPlan);

    const planDistribution = planDistRows.map((row) => ({
      plan: row.plan ?? 'free',
      count: Number(row.count),
      percentage:
        activeCompanies > 0 ? Math.round((Number(row.count) / activeCompanies) * 10000) / 100 : 0,
    }));

    // ---- Signup Trend ----
    const signupRows = await db
      .select({
        date: sql<string>`DATE(${companies.createdAt})`.as('signup_date'),
        count: sql<number>`COUNT(*)`,
      })
      .from(companies)
      .where(gte(companies.createdAt, daysAgo))
      .groupBy(sql`DATE(${companies.createdAt})`)
      .orderBy(sql`DATE(${companies.createdAt})`);

    const signupTrend = signupRows.map((row) => ({
      date: String(row.date),
      count: Number(row.count),
    }));

    // ---- MRR by Plan ----
    const mrrByPlanRows = await db
      .select({
        plan: subscriptions.plan,
        mrr: sql<number>`COALESCE(SUM(
          CASE WHEN ${subscriptions.billingCycle} = 'monthly'
            THEN ${subscriptions.priceAmount}::numeric
            ELSE ${subscriptions.priceAmount}::numeric / 12
          END
        ), 0)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))
      .groupBy(subscriptions.plan);

    const mrrByPlan = mrrByPlanRows.map((row) => ({
      plan: row.plan,
      mrr: Math.round(Number(row.mrr) * 100) / 100,
    }));

    return successResponse({
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      activeCompanies,
      totalCompanies,
      planDistribution,
      signupTrend,
      mrrByPlan,
    });
  },
});
