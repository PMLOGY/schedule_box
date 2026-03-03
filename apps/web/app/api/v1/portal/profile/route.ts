/**
 * GET/PUT /api/v1/portal/profile
 * Customer portal - view and update authenticated user's profile
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError } from '@schedulebox/shared';

/**
 * GET /api/v1/portal/profile
 * Returns authenticated user's profile info
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    const userUuid = user!.sub;

    const [dbUser] = await db
      .select({
        uuid: users.uuid,
        name: users.name,
        email: users.email,
        phone: users.phone,
      })
      .from(users)
      .where(eq(users.uuid, userUuid))
      .limit(1);

    if (!dbUser) {
      throw new NotFoundError('User not found');
    }

    return successResponse({
      uuid: dbUser.uuid,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || null,
    });
  },
});

/**
 * Profile update schema
 */
const profileUpdateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(50).optional(),
});

type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

/**
 * PUT /api/v1/portal/profile
 * Update authenticated user's profile (name, phone)
 */
export const PUT = createRouteHandler<ProfileUpdate>({
  requiresAuth: true,
  bodySchema: profileUpdateSchema,
  handler: async ({ body, user }) => {
    const userUuid = user!.sub;

    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userUuid))
      .limit(1);

    if (!dbUser) {
      throw new NotFoundError('User not found');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, dbUser.id))
      .returning({
        uuid: users.uuid,
        name: users.name,
        email: users.email,
        phone: users.phone,
      });

    return successResponse({
      uuid: updated.uuid,
      name: updated.name,
      email: updated.email,
      phone: updated.phone || null,
    });
  },
});
