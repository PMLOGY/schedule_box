/**
 * Rewards Endpoints
 * GET  /api/v1/loyalty/rewards - List rewards for company's program
 * POST /api/v1/loyalty/rewards - Create a new reward
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, loyaltyPrograms, rewards, services } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { rewardCreateSchema } from '@schedulebox/shared';

/**
 * GET /api/v1/loyalty/rewards
 * List rewards for the company's program
 * Supports is_active filter
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse query parameters
    const isActiveParam = req.nextUrl.searchParams.get('is_active');
    const isActiveFilter =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)),
    );

    // Get company's program
    const [program] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // Build query with optional is_active filter
    const conditions = [eq(rewards.programId, program.id)];
    if (isActiveFilter !== undefined) {
      conditions.push(eq(rewards.isActive, isActiveFilter));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Count total
    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(rewards)
      .where(whereClause);

    const total = Number(totalCount) || 0;

    // Fetch rewards with pagination
    const rewardsList = await db
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
      })
      .from(rewards)
      .where(whereClause)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(rewards.createdAt);

    // Convert numeric fields to numbers
    const formattedRewards = rewardsList.map((reward) => ({
      ...reward,
      rewardValue: reward.rewardValue ? Number(reward.rewardValue) : null,
    }));

    return successResponse({
      data: formattedRewards,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  },
});

/**
 * POST /api/v1/loyalty/rewards
 * Create a new reward for the company's program
 * Returns 201 with created reward
 */
export const POST = createRouteHandler({
  bodySchema: rewardCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Get company's program
    const [program] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.companyId, companyId))
      .limit(1);

    if (!program) {
      throw new NotFoundError('No loyalty program found for this company');
    }

    // If applicable_service_id provided, convert UUID to internal ID
    let applicableServiceInternalId: number | null = null;
    if (body.applicable_service_id) {
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

    // Create reward
    const [reward] = await db
      .insert(rewards)
      .values({
        programId: program.id,
        name: body.name,
        description: body.description ?? null,
        pointsCost: body.points_cost,
        rewardType: body.reward_type,
        rewardValue: body.reward_value ? String(body.reward_value) : null,
        applicableServiceId: applicableServiceInternalId,
        maxRedemptions: body.max_redemptions ?? null,
        currentRedemptions: 0,
        isActive: true,
      })
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

    return createdResponse({
      ...reward,
      rewardValue: reward.rewardValue ? Number(reward.rewardValue) : null,
    });
  },
});
