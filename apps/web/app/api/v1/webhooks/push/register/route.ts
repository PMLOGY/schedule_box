/**
 * Push Subscription Registration Endpoint
 * POST /api/v1/webhooks/push/register - Register browser push subscription
 */

import { eq } from 'drizzle-orm';
import { db, users } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

/**
 * Body schema for push subscription
 * Based on Web Push API subscription object
 */
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

type _PushSubscription = z.infer<typeof pushSubscriptionSchema>;

/**
 * POST /api/v1/webhooks/push/register
 * Register push notification subscription for current user
 *
 * Stores subscription in user's metadata JSONB field for later use
 * by notification worker service.
 *
 * Returns:
 * - 201: Subscription registered successfully
 * - 400: Invalid subscription data
 * - 401: Unauthorized
 */
export const POST = createRouteHandler({
  bodySchema: pushSubscriptionSchema,
  requiresAuth: true,
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';

    // Fetch user record
    const [userRecord] = await db.select().from(users).where(eq(users.uuid, userSub)).limit(1);

    if (!userRecord) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    // Update user metadata with push subscription
    const currentMetadata = (userRecord.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      pushSubscription: body,
    };

    await db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.uuid, userSub));

    return successResponse(
      {
        message: 'Push subscription registered successfully',
        endpoint: body.endpoint,
      },
      201,
    );
  },
});
