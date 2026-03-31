/**
 * Push Test Endpoint
 * POST /api/v1/push/test - Send a test push notification to current user
 */

import { eq } from 'drizzle-orm';
import { db, users } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { sendPushToUser } from '@/lib/push/web-push-service';

/**
 * POST /api/v1/push/test
 * Sends a test push notification to all subscriptions of the current user.
 * Useful for verifying the push pipeline works end-to-end.
 */
export const POST = createRouteHandler({
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

    const result = await sendPushToUser(userRecord.id, {
      title: 'ScheduleBox',
      body: 'Push notifikace funguje!',
      url: '/dashboard',
    });

    return successResponse({
      message: 'Test notification sent',
      ...result,
    });
  },
});
