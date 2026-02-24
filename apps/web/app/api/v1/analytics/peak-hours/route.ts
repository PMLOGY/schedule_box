/**
 * Peak Hours Analytics API
 * GET /api/v1/analytics/peak-hours - Hour-by-day booking heatmap data
 */

import { and, eq, gte, sql, isNull, inArray } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Query parameter validation schema
const peakHoursQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/v1/analytics/peak-hours
 * Returns hour-by-day booking counts for heatmap rendering
 *
 * Query params:
 * - days: number (1-365; default 30)
 *
 * Returns: Array of { dayOfWeek: number, hour: number, count: number }
 * dayOfWeek: 0=Sun..6=Sat, hour: 0-23
 * Sparse matrix — frontend fills gaps with zeros
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(peakHoursQuerySchema, req);
    const days = query.days ?? 30;

    // Calculate date threshold
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Query bookings with EXTRACT for day of week and hour
    const results = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${bookings.startTime})::int`,
        hour: sql<number>`EXTRACT(HOUR FROM ${bookings.startTime})::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.companyId, companyId),
          inArray(bookings.status, ['completed', 'confirmed', 'pending']),
          gte(bookings.startTime, daysAgo),
          isNull(bookings.deletedAt),
        ),
      )
      .groupBy(
        sql`EXTRACT(DOW FROM ${bookings.startTime})`,
        sql`EXTRACT(HOUR FROM ${bookings.startTime})`,
      );

    return successResponse(results);
  },
});
