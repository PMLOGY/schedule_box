/**
 * Notifications List and Create Endpoints
 * GET  /api/v1/notifications - List notifications with filtering
 * POST /api/v1/notifications - Create a new notification
 */

import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { paginatedResponse, successResponse } from '@/lib/utils/response';
import { notificationListQuerySchema, type NotificationListQuery } from '@schedulebox/shared';
import { publishEvent, createNotificationSendRequestedEvent } from '@schedulebox/events';
import { z } from 'zod';

/**
 * GET /api/v1/notifications
 * List notifications for company with filters
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
        .select({ count: count() })
        .from(notifications)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / query.limit);

    return paginatedResponse(data, {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: totalPages,
    });
  },
});

/**
 * Schema for creating a notification
 */
const notificationCreateSchema = z.object({
  channel: z.enum(['email', 'sms', 'push']),
  recipient: z.string().min(1).max(255),
  subject: z.string().max(255).optional(),
  body: z.string().min(1),
});

/**
 * POST /api/v1/notifications
 * Create a new notification (status: pending)
 */
export const POST = createRouteHandler({
  bodySchema: notificationCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const [notification] = await db
      .insert(notifications)
      .values({
        companyId,
        channel: body.channel,
        recipient: body.recipient,
        subject: body.subject,
        body: body.body,
        status: 'pending',
      })
      .returning();

    // Publish event to RabbitMQ for the notification worker to pick up and send
    publishEvent(
      createNotificationSendRequestedEvent({
        notificationId: notification.id,
        companyId,
        channel: body.channel,
        recipient: body.recipient,
        subject: body.subject,
        body: body.body,
      }),
    ).catch((err) => {
      console.error('[Notifications] Failed to publish send_requested event:', err);
    });

    return successResponse(notification, 201);
  },
});
