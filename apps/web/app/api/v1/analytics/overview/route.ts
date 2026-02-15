/**
 * Analytics Overview API
 * GET /api/v1/analytics/overview - Aggregated KPIs with period-over-period comparison
 */

import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db, dailyBookingSummary } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Query parameter validation schema
const overviewQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// Period stats structure
interface PeriodStats {
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  avgRevenuePerDay: number;
}

/**
 * GET /api/v1/analytics/overview
 * Returns aggregated KPIs for current period and previous period with comparison
 *
 * Query params:
 * - days: number (7, 30, 90; default 30)
 *
 * Returns: { currentPeriod, previousPeriod, comparison }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(overviewQuerySchema, req);
    const days = query.days ?? 30; // TypeScript guard (Zod default ensures this is never undefined)

    // Calculate date ranges
    const today = new Date();
    const currentPeriodStart = new Date(today);
    currentPeriodStart.setDate(currentPeriodStart.getDate() - days);

    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

    // Format dates as YYYY-MM-DD
    const currentStartDate = currentPeriodStart.toISOString().split('T')[0];
    const previousStartDate = previousPeriodStart.toISOString().split('T')[0];
    const currentEndDate = today.toISOString().split('T')[0];

    // Query current period
    const [currentPeriodData] = await db
      .select({
        totalBookings: sql<number>`COALESCE(SUM(${dailyBookingSummary.totalBookings}), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(${dailyBookingSummary.totalRevenue}), 0)`,
        completedBookings: sql<number>`COALESCE(SUM(${dailyBookingSummary.completed}), 0)`,
        cancelledBookings: sql<number>`COALESCE(SUM(${dailyBookingSummary.cancelled}), 0)`,
        noShows: sql<number>`COALESCE(SUM(${dailyBookingSummary.noShows}), 0)`,
      })
      .from(dailyBookingSummary)
      .where(
        and(
          eq(dailyBookingSummary.companyId, companyId),
          gte(dailyBookingSummary.bookingDate, currentStartDate),
        ),
      );

    // Query previous period
    const [previousPeriodData] = await db
      .select({
        totalBookings: sql<number>`COALESCE(SUM(${dailyBookingSummary.totalBookings}), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(${dailyBookingSummary.totalRevenue}), 0)`,
        completedBookings: sql<number>`COALESCE(SUM(${dailyBookingSummary.completed}), 0)`,
        cancelledBookings: sql<number>`COALESCE(SUM(${dailyBookingSummary.cancelled}), 0)`,
        noShows: sql<number>`COALESCE(SUM(${dailyBookingSummary.noShows}), 0)`,
      })
      .from(dailyBookingSummary)
      .where(
        and(
          eq(dailyBookingSummary.companyId, companyId),
          gte(dailyBookingSummary.bookingDate, previousStartDate),
          lt(dailyBookingSummary.bookingDate, currentEndDate),
        ),
      );

    // Calculate average revenue per day
    const currentPeriod: PeriodStats = {
      totalBookings: Number(currentPeriodData.totalBookings),
      totalRevenue: Number(currentPeriodData.totalRevenue),
      completedBookings: Number(currentPeriodData.completedBookings),
      cancelledBookings: Number(currentPeriodData.cancelledBookings),
      noShows: Number(currentPeriodData.noShows),
      avgRevenuePerDay: Number(currentPeriodData.totalRevenue) / days,
    };

    const previousPeriod: PeriodStats = {
      totalBookings: Number(previousPeriodData.totalBookings),
      totalRevenue: Number(previousPeriodData.totalRevenue),
      completedBookings: Number(previousPeriodData.completedBookings),
      cancelledBookings: Number(previousPeriodData.cancelledBookings),
      noShows: Number(previousPeriodData.noShows),
      avgRevenuePerDay: Number(previousPeriodData.totalRevenue) / days,
    };

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    };

    const comparison = {
      revenueChange: calculateChange(currentPeriod.totalRevenue, previousPeriod.totalRevenue),
      bookingsChange: calculateChange(currentPeriod.totalBookings, previousPeriod.totalBookings),
      noShowChange: calculateChange(currentPeriod.noShows, previousPeriod.noShows),
    };

    return successResponse({
      currentPeriod,
      previousPeriod,
      comparison,
    });
  },
});
