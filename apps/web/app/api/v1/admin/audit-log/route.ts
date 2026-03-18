/**
 * GET /api/v1/admin/audit-log
 *
 * Paginated, filterable platform audit log.
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 50, max 100)
 * - actionType: string filter
 * - adminId: number filter (admin user internal ID)
 * - from: ISO date string (filter from this date inclusive)
 * - to: ISO date string (filter to this date inclusive)
 *
 * Authorization: admin role only.
 */

import { sql, eq, desc, and, gte, lte } from 'drizzle-orm';
import { db, platformAuditLogs, users } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { paginatedResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@schedulebox/shared';

export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ req, user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)), 100);
    const offset = (page - 1) * limit;
    const actionTypeFilter = url.searchParams.get('actionType') || undefined;
    const adminIdFilter = url.searchParams.get('adminId')
      ? parseInt(url.searchParams.get('adminId')!, 10)
      : undefined;
    const fromFilter = url.searchParams.get('from') || undefined;
    const toFilter = url.searchParams.get('to') || undefined;

    // Build WHERE conditions
    const conditions = [];
    if (actionTypeFilter) {
      conditions.push(eq(platformAuditLogs.actionType, actionTypeFilter));
    }
    if (adminIdFilter) {
      conditions.push(eq(platformAuditLogs.adminId, adminIdFilter));
    }
    if (fromFilter) {
      conditions.push(gte(platformAuditLogs.timestamp, new Date(fromFilter)));
    }
    if (toFilter) {
      conditions.push(lte(platformAuditLogs.timestamp, new Date(toFilter)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const entries = await db
      .select({
        id: platformAuditLogs.id,
        timestamp: platformAuditLogs.timestamp,
        adminId: platformAuditLogs.adminId,
        adminUuid: platformAuditLogs.adminUuid,
        adminName: users.name,
        adminEmail: users.email,
        actionType: platformAuditLogs.actionType,
        targetEntityType: platformAuditLogs.targetEntityType,
        targetEntityId: platformAuditLogs.targetEntityId,
        ipAddress: platformAuditLogs.ipAddress,
        requestId: platformAuditLogs.requestId,
        beforeValue: platformAuditLogs.beforeValue,
        afterValue: platformAuditLogs.afterValue,
        metadata: platformAuditLogs.metadata,
      })
      .from(platformAuditLogs)
      .innerJoin(users, eq(platformAuditLogs.adminId, users.id))
      .where(whereClause)
      .orderBy(desc(platformAuditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(platformAuditLogs)
      .where(whereClause);

    return paginatedResponse(
      entries.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        admin: {
          id: e.adminId,
          uuid: e.adminUuid,
          name: e.adminName,
          email: e.adminEmail,
        },
        action_type: e.actionType,
        target_entity_type: e.targetEntityType,
        target_entity_id: e.targetEntityId,
        ip_address: e.ipAddress,
        request_id: e.requestId,
        before_value: e.beforeValue,
        after_value: e.afterValue,
        metadata: e.metadata,
      })),
      {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    );
  },
});
