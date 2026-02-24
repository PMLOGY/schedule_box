/**
 * Cancellations Analytics API
 * GET /api/v1/analytics/cancellations - Daily cancellation and no-show rates
 */

import { and, eq, gte, sql, isNull } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Query parameter validation schema
const cancellationsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/v1/analytics/cancellations
 * Returns daily cancellation and no-show rates over time
 *
 * Query params:
 * - days: number (1-365; default 30)
 *
 * Returns: Array of { date: string, total: number, cancelled: number, noShows: number, cancelRate: number, noShowRate: number }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(cancellationsQuerySchema, req);
    const days = query.days ?? 30;

    // Calculate date threshold
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Query bookings grouped by date with status counts
    const results = await db
      .select({
        date: sql<string>`DATE(${bookings.startTime})::text`,
        total: sql<number>`COUNT(*)::int`,
        cancelled: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')::int`,
        noShows: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')::int`,
        cancelRate: sql<number>`CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')::numeric / COUNT(*)::numeric, 4)::float ELSE 0 END`,
        noShowRate: sql<number>`CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')::numeric / COUNT(*)::numeric, 4)::float ELSE 0 END`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.companyId, companyId),
          gte(bookings.startTime, daysAgo),
          isNull(bookings.deletedAt),
        ),
      )
      .groupBy(sql`DATE(${bookings.startTime})`)
      .orderBy(sql`DATE(${bookings.startTime})`);

    return successResponse(results);
  },
});
