/**
 * Loyalty Tier Engine
 *
 * Automatic tier upgrade logic with tier progress calculation.
 * Called after every points addition to check if customer qualifies for higher tier.
 *
 * Functions:
 * - checkAndUpgradeTier: Automatically upgrade customer to highest qualified tier
 * - calculateTierProgress: Calculate progress toward next tier
 */

import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db, loyaltyCards, loyaltyTiers, loyaltyPrograms, customers } from '@schedulebox/database';
import { ValidationError } from '@schedulebox/shared';
import { publishEvent, createTierUpgradedEvent } from '@schedulebox/events';
import type { LoyaltyTier } from '@schedulebox/shared';

// ============================================================================
// CHECK AND UPGRADE TIER
// ============================================================================

/**
 * Check if customer qualifies for tier upgrade and apply if needed
 *
 * Selects highest tier where minPoints <= customer's current balance.
 * If different from current tier, updates card and publishes TierUpgradedEvent.
 *
 * @param cardId - Internal card ID (SERIAL)
 * @returns true if tier was upgraded, false otherwise
 * @throws ValidationError if card not found
 */
export async function checkAndUpgradeTier(cardId: number): Promise<boolean> {
  // Get card with current tier and points balance
  const [card] = await db
    .select({
      id: loyaltyCards.id,
      uuid: loyaltyCards.uuid,
      programId: loyaltyCards.programId,
      customerId: loyaltyCards.customerId,
      pointsBalance: loyaltyCards.pointsBalance,
      tierId: loyaltyCards.tierId,
    })
    .from(loyaltyCards)
    .where(eq(loyaltyCards.id, cardId))
    .limit(1);

  if (!card) {
    throw new ValidationError('Loyalty card not found');
  }

  const currentBalance = card.pointsBalance ?? 0;

  // Get current tier name (if exists)
  let previousTierName: string | null = null;
  if (card.tierId) {
    const [currentTier] = await db
      .select({ name: loyaltyTiers.name })
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.id, card.tierId))
      .limit(1);
    previousTierName = currentTier?.name ?? null;
  }

  // Find highest tier customer qualifies for
  const [qualifiedTier] = await db
    .select({
      id: loyaltyTiers.id,
      name: loyaltyTiers.name,
      minPoints: loyaltyTiers.minPoints,
    })
    .from(loyaltyTiers)
    .where(
      and(
        eq(loyaltyTiers.programId, card.programId),
        sql`${loyaltyTiers.minPoints} <= ${currentBalance}`,
      ),
    )
    .orderBy(desc(loyaltyTiers.minPoints))
    .limit(1);

  // No tier qualification or already at highest tier
  if (!qualifiedTier) {
    return false;
  }

  // Check if tier changed
  if (qualifiedTier.id === card.tierId) {
    return false; // Already at this tier
  }

  // Update card with new tier
  await db
    .update(loyaltyCards)
    .set({
      tierId: qualifiedTier.id,
      updatedAt: new Date(),
    })
    .where(eq(loyaltyCards.id, cardId));

  // Get customer UUID and company ID for event
  const [customer] = await db
    .select({ uuid: customers.uuid })
    .from(customers)
    .where(eq(customers.id, card.customerId))
    .limit(1);

  const [program] = await db
    .select({ companyId: loyaltyPrograms.companyId })
    .from(loyaltyPrograms)
    .where(eq(loyaltyPrograms.id, card.programId))
    .limit(1);

  if (!customer || !program) {
    throw new ValidationError('Customer or program not found');
  }

  // Publish TierUpgradedEvent
  try {
    await publishEvent(
      createTierUpgradedEvent({
        cardUuid: card.uuid,
        companyId: program.companyId,
        customerUuid: customer.uuid,
        previousTierName,
        newTierName: qualifiedTier.name,
        newTierMinPoints: qualifiedTier.minPoints,
      }),
    );
  } catch (error) {
    console.error('[Tier Engine] Failed to publish tier.upgraded event:', error);
  }

  console.log(
    `[Tier Engine] Upgraded card ${cardId} from tier "${previousTierName}" to "${qualifiedTier.name}"`,
  );

  return true;
}

// ============================================================================
// CALCULATE TIER PROGRESS
// ============================================================================

/**
 * Calculate customer's progress toward next tier
 *
 * Returns current tier details and next tier with progress percentage.
 * Progress calculation: (currentPoints - currentTierMin) / (nextTierMin - currentTierMin) * 100
 *
 * @param cardId - Internal card ID (SERIAL)
 * @returns Tier progress information
 * @throws ValidationError if card not found
 */
export async function calculateTierProgress(cardId: number): Promise<{
  currentTier: LoyaltyTier | null;
  nextTier: { name: string; minPoints: number; pointsNeeded: number } | null;
  progressPercent: number;
}> {
  // Get card with current tier and points balance
  const [card] = await db
    .select({
      id: loyaltyCards.id,
      programId: loyaltyCards.programId,
      pointsBalance: loyaltyCards.pointsBalance,
      tierId: loyaltyCards.tierId,
    })
    .from(loyaltyCards)
    .where(eq(loyaltyCards.id, cardId))
    .limit(1);

  if (!card) {
    throw new ValidationError('Loyalty card not found');
  }

  const currentBalance = card.pointsBalance ?? 0;

  // Get current tier details (if exists)
  let currentTier: LoyaltyTier | null = null;
  if (card.tierId) {
    const [tier] = await db
      .select({
        id: loyaltyTiers.id,
        name: loyaltyTiers.name,
        minPoints: loyaltyTiers.minPoints,
        benefits: loyaltyTiers.benefits,
        color: loyaltyTiers.color,
        sortOrder: loyaltyTiers.sortOrder,
      })
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.id, card.tierId))
      .limit(1);

    if (tier) {
      currentTier = {
        id: tier.id,
        name: tier.name,
        minPoints: tier.minPoints,
        benefits: (tier.benefits as Record<string, unknown>) ?? {},
        color: tier.color ?? '#3B82F6',
        sortOrder: tier.sortOrder ?? 0,
      };
    }
  }

  // Find next tier (lowest tier with minPoints > currentBalance)
  const [nextTierData] = await db
    .select({
      id: loyaltyTiers.id,
      name: loyaltyTiers.name,
      minPoints: loyaltyTiers.minPoints,
    })
    .from(loyaltyTiers)
    .where(
      and(
        eq(loyaltyTiers.programId, card.programId),
        sql`${loyaltyTiers.minPoints} > ${currentBalance}`,
      ),
    )
    .orderBy(asc(loyaltyTiers.minPoints))
    .limit(1);

  // Calculate progress
  let progressPercent = 0;
  let nextTier: { name: string; minPoints: number; pointsNeeded: number } | null = null;

  if (nextTierData) {
    const currentTierMin = currentTier?.minPoints ?? 0;
    const nextTierMin = nextTierData.minPoints;
    const pointsNeeded = nextTierMin - currentBalance;

    // Progress: (current - currentMin) / (next - currentMin) * 100
    const pointsInCurrentTier = currentBalance - currentTierMin;
    const pointsNeededForNextTier = nextTierMin - currentTierMin;

    if (pointsNeededForNextTier > 0) {
      progressPercent = Math.min(100, (pointsInCurrentTier / pointsNeededForNextTier) * 100);
    }

    nextTier = {
      name: nextTierData.name,
      minPoints: nextTierMin,
      pointsNeeded,
    };
  } else {
    // Already at highest tier
    progressPercent = 100;
  }

  return {
    currentTier,
    nextTier,
    progressPercent: Math.round(progressPercent * 10) / 10, // Round to 1 decimal
  };
}
