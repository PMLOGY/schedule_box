/**
 * Loyalty Rewards Engine
 *
 * Atomic reward redemption with stock tracking and balance validation.
 * Handles points deduction and redemption counter increment in single transaction.
 *
 * Functions:
 * - redeemReward: Redeem reward with atomic points deduction and stock tracking
 * - checkRewardAvailability: Check if reward is available for redemption
 */

import { eq, sql } from 'drizzle-orm';
import {
  db,
  dbTx,
  loyaltyCards,
  loyaltyTransactions,
  rewards,
  customers,
  loyaltyPrograms,
} from '@schedulebox/database';
import { ValidationError } from '@schedulebox/shared';
import { publishEvent, createRewardRedeemedEvent } from '@schedulebox/events';

// ============================================================================
// REDEEM REWARD
// ============================================================================

/**
 * Redeem reward atomically with points deduction and stock tracking
 *
 * Transaction flow:
 * 1. Lock reward row (SELECT FOR UPDATE) and validate availability
 * 2. Lock card row (SELECT FOR UPDATE) and validate balance
 * 3. Deduct points from card
 * 4. Insert transaction record
 * 5. Increment reward redemption counter
 * 6. Publish RewardRedeemedEvent
 *
 * @param cardId - Internal card ID (SERIAL)
 * @param rewardId - Internal reward ID (SERIAL)
 * @throws ValidationError if card not found, reward not found, reward unavailable, or insufficient balance
 */
export async function redeemReward(cardId: number, rewardId: number): Promise<void> {
  await dbTx.transaction(async (tx) => {
    // SELECT reward (validate exists, is_active, stock)
    const [reward] = await tx
      .select({
        id: rewards.id,
        programId: rewards.programId,
        name: rewards.name,
        pointsCost: rewards.pointsCost,
        isActive: rewards.isActive,
        maxRedemptions: rewards.maxRedemptions,
        currentRedemptions: rewards.currentRedemptions,
      })
      .from(rewards)
      .where(eq(rewards.id, rewardId))
      .limit(1);

    if (!reward) {
      throw new ValidationError('Reward not found');
    }

    if (!reward.isActive) {
      throw new ValidationError('Reward is not active');
    }

    // Check max_redemptions (NULL = unlimited)
    if (
      reward.maxRedemptions !== null &&
      (reward.currentRedemptions ?? 0) >= reward.maxRedemptions
    ) {
      throw new ValidationError('Reward no longer available (redemption limit reached)');
    }

    // SELECT FOR UPDATE on loyaltyCards row
    const [card] = await tx
      .select({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        programId: loyaltyCards.programId,
        customerId: loyaltyCards.customerId,
        pointsBalance: loyaltyCards.pointsBalance,
        isActive: loyaltyCards.isActive,
      })
      .from(loyaltyCards)
      .where(eq(loyaltyCards.id, cardId))
      .for('update');

    if (!card) {
      throw new ValidationError('Loyalty card not found');
    }

    if (!card.isActive) {
      throw new ValidationError('Loyalty card is inactive');
    }

    // Validate card belongs to same program as reward
    if (card.programId !== reward.programId) {
      throw new ValidationError('Reward does not belong to this loyalty program');
    }

    const currentBalance = card.pointsBalance ?? 0;
    const pointsCost = reward.pointsCost;

    // Check card.pointsBalance >= reward.pointsCost
    if (currentBalance < pointsCost) {
      throw new ValidationError(
        `Insufficient points balance. Have: ${currentBalance}, Need: ${pointsCost}`,
      );
    }

    // Calculate new balance
    const newBalance = currentBalance - pointsCost;

    // UPDATE loyaltyCards set pointsBalance = newBalance
    await tx
      .update(loyaltyCards)
      .set({
        pointsBalance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyCards.id, cardId));

    // INSERT loyaltyTransactions
    await tx.insert(loyaltyTransactions).values({
      cardId: card.id,
      bookingId: null,
      type: 'redeem',
      points: -pointsCost,
      balanceAfter: newBalance,
      description: `Redeemed: ${reward.name}`,
    });

    // UPDATE rewards set currentRedemptions = currentRedemptions + 1
    await tx
      .update(rewards)
      .set({
        currentRedemptions: sql`${rewards.currentRedemptions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(rewards.id, rewardId));

    // Get customer UUID and company ID for event
    const [customer] = await tx
      .select({ uuid: customers.uuid })
      .from(customers)
      .where(eq(customers.id, card.customerId))
      .limit(1);

    const [program] = await tx
      .select({ companyId: loyaltyPrograms.companyId })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.id, card.programId))
      .limit(1);

    if (!customer || !program) {
      throw new ValidationError('Customer or program not found');
    }

    // Publish RewardRedeemedEvent (after transaction commits)
    try {
      await publishEvent(
        createRewardRedeemedEvent({
          cardUuid: card.uuid,
          companyId: program.companyId,
          customerUuid: customer.uuid,
          rewardId: reward.id,
          rewardName: reward.name,
          pointsSpent: pointsCost,
          balanceAfter: newBalance,
        }),
      );
    } catch (error) {
      console.error('[Rewards Engine] Failed to publish reward.redeemed event:', error);
    }
  });

  console.log(`[Rewards Engine] Redeemed reward ${rewardId} for card ${cardId}`);
}

// ============================================================================
// CHECK REWARD AVAILABILITY
// ============================================================================

/**
 * Check if reward is available for redemption
 *
 * Validates:
 * - Reward is_active
 * - Stock availability (max_redemptions vs current_redemptions)
 * - Card points balance >= reward points_cost
 *
 * @param rewardId - Internal reward ID (SERIAL)
 * @param cardPointsBalance - Card's current points balance
 * @returns Availability status with reason if unavailable
 */
export async function checkRewardAvailability(
  rewardId: number,
  cardPointsBalance: number,
): Promise<{ available: boolean; reason?: string }> {
  // Get reward details
  const [reward] = await db
    .select({
      id: rewards.id,
      name: rewards.name,
      pointsCost: rewards.pointsCost,
      isActive: rewards.isActive,
      maxRedemptions: rewards.maxRedemptions,
      currentRedemptions: rewards.currentRedemptions,
    })
    .from(rewards)
    .where(eq(rewards.id, rewardId))
    .limit(1);

  if (!reward) {
    return { available: false, reason: 'Reward not found' };
  }

  // Check is_active
  if (!reward.isActive) {
    return { available: false, reason: 'Reward is not active' };
  }

  // Check max_redemptions vs current_redemptions
  if (reward.maxRedemptions !== null && (reward.currentRedemptions ?? 0) >= reward.maxRedemptions) {
    return { available: false, reason: 'Redemption limit reached' };
  }

  // Check cardPointsBalance >= pointsCost
  if (cardPointsBalance < reward.pointsCost) {
    return {
      available: false,
      reason: `Insufficient points (need ${reward.pointsCost}, have ${cardPointsBalance})`,
    };
  }

  return { available: true };
}
