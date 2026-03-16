/**
 * Platform Admin Stats API
 * GET /api/v1/admin/stats - System-wide KPI counts for admin dashboard
 *
 * Cross-tenant endpoint (no company scope). Requires admin role.
 */

import { sql } from 'drizzle-orm';
import { db, companies, users, bookings } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@schedulebox/shared';

/**
 * GET /api/v1/admin/stats
 *
 * Returns platform-wide KPIs:
 * - Total companies, users, bookings
 * - Total revenue from completed bookings
 * - New companies in the last 30 days
 * - Bookings created in the last 7 days
 *
 * Authorization: admin role only (403 for non-admin)
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Count companies
    const [companyCount] = await db.select({ count: sql<number>`count(*)::int` }).from(companies);

    // Count users
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);

    // Count bookings
    const [bookingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings);

    // Total revenue from completed bookings
    const [revenueResult] = await db
      .select({ total: sql<string>`coalesce(sum(${bookings.price}), 0)` })
      .from(bookings)
      .where(sql`${bookings.status} = 'completed'`);

    // New companies in the last 30 days
    const [activeCompanies] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(sql`${companies.createdAt} > now() - interval '30 days'`);

    // Bookings created in the last 7 days
    const [recentBookings] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(sql`${bookings.createdAt} > now() - interval '7 days'`);

    return successResponse({
      total_companies: companyCount.count,
      total_users: userCount.count,
      total_bookings: bookingCount.count,
      total_revenue: revenueResult.total,
      new_companies_30d: activeCompanies.count,
      bookings_7d: recentBookings.count,
    });
  },
});
