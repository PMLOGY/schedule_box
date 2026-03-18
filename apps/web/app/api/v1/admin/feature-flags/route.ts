/**
 * Platform Admin Feature Flags API
 * GET  /api/v1/admin/feature-flags - List all feature flags with override counts
 * POST /api/v1/admin/feature-flags - Create a new feature flag
 *
 * Cross-tenant endpoint. Requires admin role.
 */

import { sql, desc, eq } from 'drizzle-orm';
import { db } from '@schedulebox/database';
import { featureFlags, users } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@schedulebox/shared';
import { writeAuditLog } from '@/lib/admin/audit';
import { z } from 'zod';

/**
 * GET /api/v1/admin/feature-flags
 *
 * Returns all feature flags with their global state and per-company override count.
 * Authorization: admin role only.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const flags = await db
      .select({
        id: featureFlags.id,
        name: featureFlags.name,
        description: featureFlags.description,
        globalEnabled: featureFlags.globalEnabled,
        createdAt: featureFlags.createdAt,
        updatedAt: featureFlags.updatedAt,
        overrideCount: sql<number>`(
          SELECT count(*)::int FROM feature_flag_overrides
          WHERE flag_id = ${featureFlags.id}
        )`,
      })
      .from(featureFlags)
      .orderBy(desc(featureFlags.createdAt));

    return successResponse(
      flags.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        global_enabled: f.globalEnabled ?? false,
        created_at: f.createdAt,
        updated_at: f.updatedAt,
        override_count: f.overrideCount,
      })),
    );
  },
});

// ---- POST: Create Feature Flag ----

const createFlagSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-]+$/, 'Name must contain only alphanumeric characters and hyphens'),
  description: z.string().max(500).optional(),
  globalEnabled: z.boolean().default(false),
});

/**
 * POST /api/v1/admin/feature-flags
 *
 * Creates a new feature flag.
 * Body: { name, description?, globalEnabled }
 * Authorization: admin role only.
 */
export const POST = createRouteHandler({
  requiresAuth: true,
  bodySchema: createFlagSchema,
  handler: async ({ req, body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const adminUuid = user.sub;
    const [adminRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, adminUuid))
      .limit(1);

    const [created] = await db
      .insert(featureFlags)
      .values({
        name: body.name,
        description: body.description ?? null,
        globalEnabled: body.globalEnabled,
      })
      .returning();

    await writeAuditLog({
      req,
      adminUuid,
      adminId: adminRecord?.id ?? 0,
      actionType: 'feature_flag_create',
      targetEntityType: 'feature_flag',
      targetEntityId: String(created.id),
      afterValue: { name: created.name, globalEnabled: created.globalEnabled },
    });

    return successResponse({
      id: created.id,
      name: created.name,
      description: created.description,
      global_enabled: created.globalEnabled ?? false,
      created_at: created.createdAt,
      updated_at: created.updatedAt,
      override_count: 0,
    });
  },
});
