/**
 * Platform Admin Feature Flag Overrides API
 * GET  /api/v1/admin/feature-flags/[id]/overrides - List company overrides for a flag
 * POST /api/v1/admin/feature-flags/[id]/overrides - Create/update a company override
 *
 * Requires admin role.
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '@schedulebox/database';
import { featureFlags, featureFlagOverrides, companies, users } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { writeAuditLog } from '@/lib/admin/audit';
import { invalidateFlagCache } from '@/lib/admin/feature-flags';
import { z } from 'zod';

const idParamsSchema = z.object({ id: z.string() });

/**
 * GET /api/v1/admin/feature-flags/[id]/overrides
 *
 * Returns all per-company overrides for the given flag, with company name.
 * Authorization: admin role only.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  paramsSchema: idParamsSchema,
  handler: async ({ user, params }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const flagId = parseInt((params as { id: string })?.id, 10);
    if (isNaN(flagId)) {
      throw new NotFoundError('Feature flag not found');
    }

    const [flag] = await db
      .select({ id: featureFlags.id, name: featureFlags.name })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId))
      .limit(1);

    if (!flag) {
      throw new NotFoundError('Feature flag not found');
    }

    const overrides = await db
      .select({
        id: featureFlagOverrides.id,
        companyId: featureFlagOverrides.companyId,
        enabled: featureFlagOverrides.enabled,
        createdAt: featureFlagOverrides.createdAt,
        companyName: companies.name,
        companyUuid: companies.uuid,
      })
      .from(featureFlagOverrides)
      .innerJoin(companies, eq(featureFlagOverrides.companyId, companies.id))
      .where(eq(featureFlagOverrides.flagId, flagId));

    return successResponse(
      overrides.map((o) => ({
        id: o.id,
        company_id: o.companyId,
        company_name: o.companyName,
        company_uuid: o.companyUuid,
        enabled: o.enabled,
        created_at: o.createdAt,
      })),
    );
  },
});

// ---- POST: Create/Update Company Override ----

const upsertOverrideSchema = z.object({
  companyId: z.number().int().positive(),
  enabled: z.boolean(),
});

/**
 * POST /api/v1/admin/feature-flags/[id]/overrides
 *
 * Creates or updates a per-company override for the given flag.
 * Uses ON CONFLICT upsert (flagId, companyId) unique constraint.
 * Invalidates Redis cache for the company-specific key.
 * Authorization: admin role only.
 */
export const POST = createRouteHandler({
  requiresAuth: true,
  bodySchema: upsertOverrideSchema,
  paramsSchema: idParamsSchema,
  handler: async ({ req, body, user, params }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const flagId = parseInt((params as { id: string })?.id, 10);
    if (isNaN(flagId)) {
      throw new NotFoundError('Feature flag not found');
    }

    const [flag] = await db
      .select({ id: featureFlags.id, name: featureFlags.name })
      .from(featureFlags)
      .where(eq(featureFlags.id, flagId))
      .limit(1);

    if (!flag) {
      throw new NotFoundError('Feature flag not found');
    }

    const [upserted] = await db
      .insert(featureFlagOverrides)
      .values({
        flagId,
        companyId: body.companyId,
        enabled: body.enabled,
      })
      .onConflictDoUpdate({
        target: [featureFlagOverrides.flagId, featureFlagOverrides.companyId],
        set: { enabled: sql`excluded.enabled` },
      })
      .returning();

    await invalidateFlagCache(flag.name, body.companyId);

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
      actionType: 'feature_flag_override_upsert',
      targetEntityType: 'feature_flag_override',
      targetEntityId: String(upserted.id),
      afterValue: { flagId, flagName: flag.name, companyId: body.companyId, enabled: body.enabled },
    });

    return successResponse({
      id: upserted.id,
      flag_id: upserted.flagId,
      company_id: upserted.companyId,
      enabled: upserted.enabled,
      created_at: upserted.createdAt,
    });
  },
});
