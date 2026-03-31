/**
 * Push Unsubscribe Endpoint
 * POST /api/v1/push/unsubscribe - Remove browser push subscription
 */

import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, users, pushSubscriptions } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

/**
 * POST /api/v1/push/unsubscribe
 * Remove a push subscription for the current user by endpoint URL.
 */
export const POST = createRouteHandler({
  bodySchema: unsubscribeSchema,
  requiresAuth: true,
  handler: async ({ body, user }) => {
    const userUuid = user?.sub ?? '';

    // Resolve user serial ID from UUID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userUuid))
      .limit(1);

    if (!userRecord) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userRecord.id),
          eq(pushSubscriptions.endpoint, body.endpoint),
        ),
      );

    return successResponse({ message: 'Unsubscribed' });
  },
});
