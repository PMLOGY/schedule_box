/**
 * Push Subscribe Endpoint
 * POST /api/v1/push/subscribe - Store browser push subscription
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users, pushSubscriptions } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
});

/**
 * POST /api/v1/push/subscribe
 * Register or update a push subscription for the current user.
 * Uses upsert (ON CONFLICT userId+endpoint DO UPDATE) to prevent duplicates.
 */
export const POST = createRouteHandler({
  bodySchema: subscribeSchema,
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

    // Upsert: insert or update on conflict
    await db
      .insert(pushSubscriptions)
      .values({
        userId: userRecord.id,
        endpoint: body.endpoint,
        keysP256dh: body.keys.p256dh,
        keysAuth: body.keys.auth,
        userAgent: body.userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: {
          keysP256dh: body.keys.p256dh,
          keysAuth: body.keys.auth,
          userAgent: body.userAgent ?? null,
        },
      });

    return successResponse({ message: 'Subscribed' }, 201);
  },
});
