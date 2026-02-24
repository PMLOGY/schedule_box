/**
 * Payment Methods Analytics API
 * GET /api/v1/analytics/payment-methods - Payment gateway breakdown for pie chart
 */

import { and, eq, gte, sql, isNull } from 'drizzle-orm';
import { db, payments } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Query parameter validation schema
const paymentMethodsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/v1/analytics/payment-methods
 * Returns payment gateway breakdown for the last N days
 *
 * Query params:
 * - days: number (1-365; default 30)
 *
 * Returns: Array of { gateway: string, count: number, totalAmount: number, percentage: string }
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(paymentMethodsQuerySchema, req);
    const days = query.days ?? 30;

    // Calculate date threshold
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Query payments grouped by gateway
    const results = await db
      .select({
        gateway: payments.gateway,
        count: sql<number>`COUNT(*)::int`,
        totalAmount: sql<number>`COALESCE(SUM(${payments.amount}::numeric), 0)::float`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.companyId, companyId),
          eq(payments.status, 'paid'),
          gte(payments.createdAt, daysAgo),
          isNull(payments.deletedAt),
        ),
      )
      .groupBy(payments.gateway);

    // Calculate total count for percentage
    const totalCount = results.reduce((sum, r) => sum + r.count, 0);

    // Add percentage to each result
    const withPercentage = results.map((r) => ({
      gateway: r.gateway,
      count: r.count,
      totalAmount: r.totalAmount,
      percentage: totalCount > 0 ? ((r.count / totalCount) * 100).toFixed(1) : '0.0',
    }));

    return successResponse(withPercentage);
  },
});
