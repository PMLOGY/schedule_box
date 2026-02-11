/**
 * Notification Detail Endpoint
 * GET /api/v1/notifications/:id - Get single notification
 */

import { eq, and } from 'drizzle-orm';
import { db, notifications, notificationTemplates } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

/**
 * Params schema for notification ID
 * Note: Route params come as strings, we parse to number in handler
 */
const notificationParamsSchema = z.object({
  id: z.string(),
});

type NotificationParams = { id: string };

/**
 * GET /api/v1/notifications/:id
 * Get single notification by ID with optional template info
 */
export const GET = createRouteHandler({
  paramsSchema: notificationParamsSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);
    const { id: idStr } = params as NotificationParams;

    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid notification ID', 400);
    }

    // Query notification with optional template info
    const [notification] = await db
      .select({
        notification: notifications,
        template: notificationTemplates,
      })
      .from(notifications)
      .leftJoin(notificationTemplates, eq(notifications.templateId, notificationTemplates.id))
      .where(and(eq(notifications.id, id), eq(notifications.companyId, companyId)))
      .limit(1);

    if (!notification) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Notification not found', 404);
    }

    // Flatten response
    return successResponse({
      ...notification.notification,
      template: notification.template || null,
    });
  },
});
