/**
 * Reward Detail Endpoints
 * GET    /api/v1/loyalty/rewards/:id - Get reward detail
 * PUT    /api/v1/loyalty/rewards/:id - Update reward
 * DELETE /api/v1/loyalty/rewards/:id - Soft delete reward (set is_active = false)
 */

import { eq, and } from 'drizzle-orm';
import { db, rewards, loyaltyPrograms, services } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { rewardUpdateSchema } from '@schedulebox/shared';
import { z } from 'zod';

// Params schema for reward ID
const rewardIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * GET /api/v1/loyalty/rewards/:id
 * Get reward detail by ID
 * Validates ownership via program -> companyId
 */
export const GET = createRouteHandler({
  paramsSchema: rewardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Fetch reward with program validation
    const [reward] = await db
      .select({
        id: rewards.id,
        name: rewards.name,
        description: rewards.description,
        pointsCost: rewards.pointsCost,
        rewardType: rewards.rewardType,
        rewardValue: rewards.rewardValue,
        applicableServiceId: rewards.applicableServiceId,
        maxRedemptions: rewards.maxRedemptions,
        currentRedemptions: rewards.currentRedemptions,
        isActive: rewards.isActive,
        createdAt: rewards.createdAt,
        updatedAt: rewards.updatedAt,
        programId: rewards.programId,
      })
      .from(rewards)
      .innerJoin(loyaltyPrograms, eq(rewards.programId, loyaltyPrograms.id))
      .where(and(eq(rewards.id, params.id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!reward) {
      throw new NotFoundError('Reward not found');
    }

    return successResponse({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      rewardType: reward.rewardType,
      rewardValue: reward.rewardValue ? Number(reward.rewardValue) : null,
      applicableServiceId: reward.applicableServiceId,
      maxRedemptions: reward.maxRedemptions,
      currentRedemptions: reward.currentRedemptions,
      isActive: reward.isActive,
      createdAt: reward.createdAt,
      updatedAt: reward.updatedAt,
    });
  },
});

/**
 * PUT /api/v1/loyalty/rewards/:id
 * Update reward
 * Validates ownership via program -> companyId
 */
export const PUT = createRouteHandler({
  bodySchema: rewardUpdateSchema,
  paramsSchema: rewardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ body, params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Verify reward exists and belongs to company
    const [existing] = await db
      .select({ id: rewards.id, programId: rewards.programId })
      .from(rewards)
      .innerJoin(loyaltyPrograms, eq(rewards.programId, loyaltyPrograms.id))
      .where(and(eq(rewards.id, params.id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Reward not found');
    }

    // If applicable_service_id provided, convert UUID to internal ID
    let applicableServiceInternalId: number | null | undefined = undefined;
    if (body.applicable_service_id !== undefined) {
      if (body.applicable_service_id === null) {
        applicableServiceInternalId = null;
      } else {
        const [service] = await db
          .select({ id: services.id })
          .from(services)
          .where(
            and(eq(services.uuid, body.applicable_service_id), eq(services.companyId, companyId)),
          )
          .limit(1);

        if (!service) {
          throw new NotFoundError('Service not found');
        }
        applicableServiceInternalId = service.id;
      }
    }

    // Update reward
    const [updated] = await db
      .update(rewards)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.points_cost !== undefined && { pointsCost: body.points_cost }),
        ...(body.reward_type && { rewardType: body.reward_type }),
        ...(body.reward_value !== undefined && {
          rewardValue: body.reward_value ? String(body.reward_value) : null,
        }),
        ...(applicableServiceInternalId !== undefined && {
          applicableServiceId: applicableServiceInternalId,
        }),
        ...(body.max_redemptions !== undefined && { maxRedemptions: body.max_redemptions }),
        ...(body.is_active !== undefined && { isActive: body.is_active }),
        updatedAt: new Date(),
      })
      .where(eq(rewards.id, params.id))
      .returning({
        id: rewards.id,
        name: rewards.name,
        description: rewards.description,
        pointsCost: rewards.pointsCost,
        rewardType: rewards.rewardType,
        rewardValue: rewards.rewardValue,
        applicableServiceId: rewards.applicableServiceId,
        maxRedemptions: rewards.maxRedemptions,
        currentRedemptions: rewards.currentRedemptions,
        isActive: rewards.isActive,
        createdAt: rewards.createdAt,
        updatedAt: rewards.updatedAt,
      });

    return successResponse({
      ...updated,
      rewardValue: updated.rewardValue ? Number(updated.rewardValue) : null,
    });
  },
});

/**
 * DELETE /api/v1/loyalty/rewards/:id
 * Soft delete reward (set is_active = false)
 * Does not actually DELETE the row
 */
export const DELETE = createRouteHandler({
  paramsSchema: rewardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Verify reward exists and belongs to company
    const [existing] = await db
      .select({ id: rewards.id })
      .from(rewards)
      .innerJoin(loyaltyPrograms, eq(rewards.programId, loyaltyPrograms.id))
      .where(and(eq(rewards.id, params.id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Reward not found');
    }

    // Soft delete: set is_active = false
    await db
      .update(rewards)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(rewards.id, params.id));

    return successResponse({ success: true });
  },
});
