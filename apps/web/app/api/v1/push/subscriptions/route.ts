/**
 * Push Subscriptions List Endpoint
 * GET /api/v1/push/subscriptions - Return current user's push subscriptions
 */

import { eq } from 'drizzle-orm';
import { db, users, pushSubscriptions } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';

/**
 * GET /api/v1/push/subscriptions
 * Returns all push subscriptions for the authenticated user.
 * Used by the settings UI to determine if the current browser is subscribed.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
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

    try {
      const subscriptions = await db
        .select({
          id: pushSubscriptions.id,
          endpoint: pushSubscriptions.endpoint,
          userAgent: pushSubscriptions.userAgent,
          createdAt: pushSubscriptions.createdAt,
        })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userRecord.id));

      return successResponse(subscriptions);
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        (e.message?.includes('does not exist') || e.message?.includes('Failed query'))
      ) {
        return successResponse([]);
      }
      throw e;
    }
  },
});
