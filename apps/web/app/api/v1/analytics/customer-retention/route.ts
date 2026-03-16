/**
 * Customer Retention Analytics API
 * GET /api/v1/analytics/customer-retention - Repeat booking rate, churn stats, CLV distribution
 */

import { and, eq, sql, isNull } from 'drizzle-orm';
import { db, customers } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';

/**
 * GET /api/v1/analytics/customer-retention
 * Returns combined retention metrics: repeat booking rate, churn stats, CLV distribution
 *
 * No date param needed — uses customer aggregate fields (totalBookings, lastVisitAt, clvPredicted)
 *
 * Returns: {
 *   repeatBooking: { repeatRate: number, totalCustomers: number, repeatCustomers: number },
 *   churn: { churned: number, atRisk: number, active: number },
 *   clvDistribution: Array<{ range: string, count: number }>
 * }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Date thresholds for churn analysis (as ISO strings for SQL interpolation)
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const oneEightyDaysAgo = new Date(now);
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);
    const ninetyStr = ninetyDaysAgo.toISOString();
    const oneEightyStr = oneEightyDaysAgo.toISOString();

    // --- Repeat Booking Rate ---
    const [repeatBookingResult] = await db
      .select({
        totalCustomers: sql<number>`COUNT(*)::int`,
        repeatCustomers: sql<number>`COUNT(*) FILTER (WHERE ${customers.totalBookings} > 1)::int`,
      })
      .from(customers)
      .where(and(eq(customers.companyId, companyId), isNull(customers.deletedAt)));

    const totalCustomers = repeatBookingResult?.totalCustomers ?? 0;
    const repeatCustomers = repeatBookingResult?.repeatCustomers ?? 0;
    const repeatRate =
      totalCustomers > 0 ? Number((repeatCustomers / totalCustomers).toFixed(4)) : 0;

    // --- Customer Churn ---
    const [churnResult] = await db
      .select({
        // Churned: lastVisitAt older than 180 days or null
        churned: sql<number>`COUNT(*) FILTER (WHERE ${customers.lastVisitAt} IS NULL OR ${customers.lastVisitAt} <= ${oneEightyStr}::timestamptz)::int`,
        // At risk: lastVisitAt between 90-180 days ago
        atRisk: sql<number>`COUNT(*) FILTER (WHERE ${customers.lastVisitAt} > ${oneEightyStr}::timestamptz AND ${customers.lastVisitAt} <= ${ninetyStr}::timestamptz)::int`,
        // Active: lastVisitAt within 90 days
        active: sql<number>`COUNT(*) FILTER (WHERE ${customers.lastVisitAt} > ${ninetyStr}::timestamptz)::int`,
      })
      .from(customers)
      .where(and(eq(customers.companyId, companyId), isNull(customers.deletedAt)));

    // --- CLV Distribution --- (raw SQL to avoid Drizzle GROUP BY issues)
    const clvResults = await db.execute<{ range: string; count: number }>(sql`
      SELECT
        CASE
          WHEN clv_predicted::numeric < 500 THEN '0-500'
          WHEN clv_predicted::numeric < 2000 THEN '500-2000'
          WHEN clv_predicted::numeric < 5000 THEN '2000-5000'
          WHEN clv_predicted::numeric < 10000 THEN '5000-10000'
          ELSE '10000+'
        END AS range,
        COUNT(*)::int AS count
      FROM customers
      WHERE company_id = ${companyId}
        AND deleted_at IS NULL
        AND clv_predicted IS NOT NULL
      GROUP BY 1
      ORDER BY MIN(clv_predicted::numeric)
    `);

    return successResponse({
      repeatBooking: {
        repeatRate,
        totalCustomers,
        repeatCustomers,
      },
      churn: {
        churned: churnResult?.churned ?? 0,
        atRisk: churnResult?.atRisk ?? 0,
        active: churnResult?.active ?? 0,
      },
      clvDistribution: (clvResults as unknown as { rows?: unknown[] }).rows ?? clvResults,
    });
  },
});
