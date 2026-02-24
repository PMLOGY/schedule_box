/**
 * Employee Utilization Analytics API
 * GET /api/v1/analytics/employees - Per-employee booking stats with occupancy approximation
 */

import { and, eq, gte, isNull, sql } from 'drizzle-orm';
import { db, employees, bookings, services } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Query parameter validation schema
const employeeUtilizationQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/v1/analytics/employees
 * Returns per-employee utilization data for the last N days
 *
 * Query params:
 * - days: number (1-365, default 30)
 *
 * Returns: Array of { employeeId, employeeName, bookingCount, totalRevenue, occupancyPercent }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(employeeUtilizationQuerySchema, req);
    const days = query.days ?? 30;

    // Calculate date threshold
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Query per-employee booking stats
    // LEFT JOIN bookings to get employees with zero bookings too
    const results = await db
      .select({
        employeeId: employees.uuid,
        employeeName: employees.name,
        bookingCount: sql<number>`COALESCE(COUNT(${bookings.id}), 0)::int`,
        totalRevenue: sql<number>`COALESCE(SUM(${bookings.price} - ${bookings.discountAmount}), 0)`,
        avgServiceDuration: sql<number>`COALESCE(AVG(${services.durationMinutes}), 0)`,
      })
      .from(employees)
      .leftJoin(
        bookings,
        and(
          eq(bookings.employeeId, employees.id),
          eq(bookings.status, 'completed'),
          gte(bookings.startTime, daysAgo),
          isNull(bookings.deletedAt),
        ),
      )
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(
        and(
          eq(employees.companyId, companyId),
          eq(employees.isActive, true),
          isNull(employees.deletedAt),
        ),
      )
      .groupBy(employees.id, employees.uuid, employees.name)
      .orderBy(sql`COUNT(${bookings.id}) DESC`);

    // Calculate occupancy approximation per employee
    // workingDaysInPeriod = min(days, days * 5/7) (business day approximation)
    // occupancyPercent = (bookingCount * avgServiceDuration) / (workingDaysInPeriod * 480 minutes)
    // 480 = 8 hours working day in minutes
    const workingDaysInPeriod = Math.max(1, Math.floor(days * 5 / 7));
    const totalWorkingMinutes = workingDaysInPeriod * 480;

    const employeeStats = results.map((row) => {
      const bookingCount = Number(row.bookingCount) || 0;
      const avgDuration = Number(row.avgServiceDuration) || 0;
      const totalRevenue = Number(row.totalRevenue) || 0;

      let occupancyPercent = 0;
      if (bookingCount > 0 && avgDuration > 0) {
        occupancyPercent = Math.min(
          100,
          Math.round(((bookingCount * avgDuration) / totalWorkingMinutes) * 100),
        );
      }

      return {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        bookingCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        occupancyPercent,
      };
    });

    return successResponse(employeeStats);
  },
});
