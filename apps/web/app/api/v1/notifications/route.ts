/**
 * Notifications List Endpoint
 * GET /api/v1/notifications - List notifications with filtering
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { paginatedResponse } from '@/lib/utils/response';
import { notificationListQuerySchema, type NotificationListQuery } from '@schedulebox/shared';

/**
 * GET /api/v1/notifications
 * List notifications for company with filters
 *
 * Supports filtering by:
 * - channel (email/sms/push)
 * - status (pending/sent/delivered/failed/opened/clicked)
 * - customerId (integer)
 * - dateFrom/dateTo (ISO date strings)
 *
 * Results are paginated and ordered by createdAt DESC
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const query = validateQuery(notificationListQuerySchema, req) as NotificationListQuery;

    // Build where conditions
    const conditions = [eq(notifications.companyId, companyId)];

    if (query.channel) {
      conditions.push(eq(notifications.channel, query.channel));
    }

    if (query.status) {
      conditions.push(eq(notifications.status, query.status));
    }

    if (query.customerId) {
      conditions.push(eq(notifications.customerId, query.customerId));
    }

    if (query.dateFrom) {
      conditions.push(gte(notifications.createdAt, new Date(query.dateFrom)));
    }

    if (query.dateTo) {
      conditions.push(lte(notifications.createdAt, new Date(query.dateTo)));
    }

    // Calculate pagination
    const offset = (query.page - 1) * query.limit;

    // Query notifications
    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .limit(query.limit)
        .offset(offset)
        .orderBy(desc(notifications.createdAt)),
      db
        .select({ count: db.$count(notifications.id) })
        .from(notifications)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / query.limit);

    return paginatedResponse(data, {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: totalPages,
    });
  },
});
