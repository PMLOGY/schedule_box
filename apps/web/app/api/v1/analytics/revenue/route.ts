/**
 * Revenue Analytics API
 * GET /api/v1/analytics/revenue - Time-series revenue data from v_daily_booking_summary
 */

import { and, eq, gte, sql } from 'drizzle-orm';
import { db, dailyBookingSummary } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Query parameter validation schema
const revenueQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/v1/analytics/revenue
 * Returns time-series revenue data for the last N days
 *
 * Query params:
 * - days: number (7, 30, 90; default 30)
 *
 * Returns: Array of { date: string, revenue: number, bookings: number }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(revenueQuerySchema, req);
    const days = query.days ?? 30; // TypeScript guard (Zod default ensures this is never undefined)

    // Calculate date threshold
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const dateThreshold = daysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Query v_daily_booking_summary view
    const results = await db
      .select({
        date: dailyBookingSummary.bookingDate,
        revenue: sql<number>`COALESCE(${dailyBookingSummary.totalRevenue}, 0)`,
        bookings: dailyBookingSummary.totalBookings,
      })
      .from(dailyBookingSummary)
      .where(
        and(
          eq(dailyBookingSummary.companyId, companyId),
          gte(dailyBookingSummary.bookingDate, dateThreshold),
        ),
      )
      .orderBy(dailyBookingSummary.bookingDate);

    return successResponse(results);
  },
});
