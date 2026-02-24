/**
 * Top Services Analytics API
 * GET /api/v1/analytics/top-services - Top services ranked by revenue for bar chart
 */

import { and, eq, gte, sql, isNull, desc } from 'drizzle-orm';
import { db, bookings, services } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Query parameter validation schema
const topServicesQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/v1/analytics/top-services
 * Returns top 10 services ranked by revenue for the last N days
 *
 * Query params:
 * - days: number (1-365; default 30)
 *
 * Returns: Array of { serviceId: string, serviceName: string, bookingCount: number, totalRevenue: number }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(topServicesQuerySchema, req);
    const days = query.days ?? 30;

    // Calculate date threshold
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Query bookings joined with services, grouped by service, ordered by revenue
    const results = await db
      .select({
        serviceId: services.uuid,
        serviceName: services.name,
        bookingCount: sql<number>`COUNT(*)::int`,
        totalRevenue: sql<number>`COALESCE(SUM((${bookings.price}::numeric - COALESCE(${bookings.discountAmount}::numeric, 0))), 0)::float`,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(
        and(
          eq(bookings.companyId, companyId),
          eq(bookings.status, 'completed'),
          gte(bookings.startTime, daysAgo),
          isNull(bookings.deletedAt),
        ),
      )
      .groupBy(services.id, services.uuid, services.name)
      .orderBy(
        desc(
          sql`SUM((${bookings.price}::numeric - COALESCE(${bookings.discountAmount}::numeric, 0)))`,
        ),
      )
      .limit(10);

    return successResponse(results);
  },
});
