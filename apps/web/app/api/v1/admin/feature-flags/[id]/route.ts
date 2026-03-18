/**
 * Platform Admin Feature Flag Detail API
 * PUT    /api/v1/admin/feature-flags/[id] - Update flag (toggle globalEnabled, update description)
 * DELETE /api/v1/admin/feature-flags/[id] - Delete flag (cascades to overrides)
 *
 * Requires admin role.
 */

import { eq } from 'drizzle-orm';
import { db } from '@schedulebox/database';
import { featureFlags, users } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { writeAuditLog } from '@/lib/admin/audit';
import { invalidateFlagCache } from '@/lib/admin/feature-flags';
import { z } from 'zod';

const idParamsSchema = z.object({ id: z.string() });

// ---- PUT: Update Feature Flag ----

const updateFlagSchema = z.object({
  globalEnabled: z.boolean().optional(),
  description: z.string().max(500).optional().nullable(),
});

/**
 * PUT /api/v1/admin/feature-flags/[id]
 *
 * Updates a feature flag's globalEnabled and/or description.
 * Invalidates Redis cache for the flag.
 * Authorization: admin role only.
 */
export const PUT = createRouteHandler({
  requiresAuth: true,
  bodySchema: updateFlagSchema,
  paramsSchema: idParamsSchema,
  handler: async ({ req, body, user, params }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const flagId = parseInt((params as { id: string })?.id, 10);
    if (isNaN(flagId)) {
      throw new NotFoundError('Feature flag not found');
    }

    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Feature flag not found');
    }

    const updates: { globalEnabled?: boolean; description?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (body.globalEnabled !== undefined) updates.globalEnabled = body.globalEnabled;
    if (body.description !== undefined) updates.description = body.description;

    const [updated] = await db
      .update(featureFlags)
      .set(updates)
      .where(eq(featureFlags.id, flagId))
      .returning();

    await invalidateFlagCache(existing.name);

    const adminUuid = user.sub;
    const [adminRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, adminUuid))
      .limit(1);

    await writeAuditLog({
      req,
      adminUuid,
      adminId: adminRecord?.id ?? 0,
      actionType: 'feature_flag_update',
      targetEntityType: 'feature_flag',
      targetEntityId: String(flagId),
      beforeValue: { globalEnabled: existing.globalEnabled, description: existing.description },
      afterValue: { globalEnabled: updated.globalEnabled, description: updated.description },
    });

    return successResponse({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      global_enabled: updated.globalEnabled ?? false,
      updated_at: updated.updatedAt,
    });
  },
});

// ---- DELETE: Delete Feature Flag ----

/**
 * DELETE /api/v1/admin/feature-flags/[id]
 *
 * Deletes a feature flag. Cascades to overrides.
 * Invalidates Redis cache for the flag.
 * Authorization: admin role only.
 */
export const DELETE = createRouteHandler({
  requiresAuth: true,
  paramsSchema: idParamsSchema,
  handler: async ({ req, user, params }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const flagId = parseInt((params as { id: string })?.id, 10);
    if (isNaN(flagId)) {
      throw new NotFoundError('Feature flag not found');
    }

    const [existing] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Feature flag not found');
    }

    await invalidateFlagCache(existing.name);

    await db.delete(featureFlags).where(eq(featureFlags.id, flagId));

    const adminUuid = user.sub;
    const [adminRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, adminUuid))
      .limit(1);

    await writeAuditLog({
      req,
      adminUuid,
      adminId: adminRecord?.id ?? 0,
      actionType: 'feature_flag_delete',
      targetEntityType: 'feature_flag',
      targetEntityId: String(flagId),
      beforeValue: { name: existing.name, globalEnabled: existing.globalEnabled },
    });

    return successResponse({ success: true });
  },
});
