/**
 * Redeem Reward Endpoint
 * POST /api/v1/loyalty/rewards/:id/redeem - Redeem a reward using points from a loyalty card
 *
 * Validates reward and card ownership via program -> companyId, ensures same program,
 * then delegates to rewards engine for atomic redemption.
 */

import { eq, and } from 'drizzle-orm';
import { db, rewards, loyaltyCards, loyaltyPrograms } from '@schedulebox/database';
import { NotFoundError, ValidationError, ConflictError } from '@schedulebox/shared';
import { redeemRewardSchema } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { redeemReward } from '@/lib/loyalty/rewards-engine';
import { z } from 'zod';

// Params schema for reward ID (numeric per DB design)
const rewardIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * POST /api/v1/loyalty/rewards/:id/redeem
 * Redeem a reward using points from a loyalty card
 *
 * - Validates reward ID and ownership via program -> companyId
 * - Validates card UUID from body.card_id and ownership
 * - Ensures card and reward belong to same loyalty program
 * - Calls redeemReward from rewards engine (handles locking, balance check, stock)
 * - Returns success with reward info and new balance
 */
export const POST = createRouteHandler({
  bodySchema: redeemRewardSchema,
  paramsSchema: rewardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ body, params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Look up reward by ID, validate ownership via program -> companyId
    const [reward] = await db
      .select({
        id: rewards.id,
        name: rewards.name,
        pointsCost: rewards.pointsCost,
        isActive: rewards.isActive,
        maxRedemptions: rewards.maxRedemptions,
        currentRedemptions: rewards.currentRedemptions,
        programId: rewards.programId,
      })
      .from(rewards)
      .innerJoin(loyaltyPrograms, eq(rewards.programId, loyaltyPrograms.id))
      .where(and(eq(rewards.id, params.id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!reward) {
      throw new NotFoundError('Reward not found');
    }

    // Check reward is active
    if (!reward.isActive) {
      throw new ValidationError('Reward is not available');
    }

    // Check max redemptions (NULL = unlimited)
    if (
      reward.maxRedemptions !== null &&
      (reward.currentRedemptions ?? 0) >= reward.maxRedemptions
    ) {
      throw new ConflictError('Reward no longer available (redemption limit reached)');
    }

    // Look up card by UUID from body, validate ownership via program -> companyId
    const [card] = await db
      .select({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        pointsBalance: loyaltyCards.pointsBalance,
        programId: loyaltyCards.programId,
        isActive: loyaltyCards.isActive,
      })
      .from(loyaltyCards)
      .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
      .where(and(eq(loyaltyCards.uuid, body.card_id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!card) {
      throw new NotFoundError('Loyalty card not found');
    }

    // Validate card and reward belong to same program
    if (card.programId !== reward.programId) {
      throw new ValidationError('Card and reward do not belong to the same loyalty program');
    }

    // Check card is active
    if (!card.isActive) {
      throw new ValidationError('Loyalty card is inactive');
    }

    // Check sufficient balance (pre-check for better error message)
    const currentBalance = card.pointsBalance ?? 0;
    if (currentBalance < reward.pointsCost) {
      throw new ValidationError(
        `Insufficient points balance. Have: ${currentBalance}, Need: ${reward.pointsCost}`,
      );
    }

    // Redeem via engine (handles atomic locking, balance deduction, stock increment, events)
    await redeemReward(card.id, reward.id);

    // Calculate new balance after redemption
    const newBalance = currentBalance - reward.pointsCost;

    return successResponse({
      message: 'Reward redeemed successfully',
      reward: {
        name: reward.name,
        pointsCost: reward.pointsCost,
      },
      newBalance,
    });
  },
});
