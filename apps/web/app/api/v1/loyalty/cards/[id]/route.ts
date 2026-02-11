/**
 * Loyalty Card Detail Endpoint
 * GET /api/v1/loyalty/cards/:id - Get card detail with tier progress
 */

import { eq, and } from 'drizzle-orm';
import { db, loyaltyCards, loyaltyPrograms, loyaltyTiers, customers } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// Params schema for card UUID
const cardIdParamSchema = z.object({
  id: z.string().uuid('Invalid card ID format'),
});

/**
 * Calculate tier progress for a card
 * Returns next tier and points needed to reach it
 */
async function calculateTierProgress(cardId: number, currentPoints: number, programId: number) {
  // Find all tiers for this program ordered by minPoints
  const tiers = await db
    .select({
      id: loyaltyTiers.id,
      name: loyaltyTiers.name,
      minPoints: loyaltyTiers.minPoints,
    })
    .from(loyaltyTiers)
    .where(eq(loyaltyTiers.programId, programId))
    .orderBy(loyaltyTiers.minPoints);

  if (tiers.length === 0) {
    return { nextTier: null, progressPercent: 0 };
  }

  // Find next tier (first tier with minPoints > currentPoints)
  const nextTier = tiers.find((tier) => tier.minPoints > currentPoints);

  if (!nextTier) {
    // Already at max tier
    return { nextTier: null, progressPercent: 100 };
  }

  // Find current tier (highest tier with minPoints <= currentPoints)
  const currentTier = [...tiers].reverse().find((tier) => tier.minPoints <= currentPoints);
  const currentMinPoints = currentTier?.minPoints ?? 0;

  // Calculate progress percentage
  const pointsInCurrentTier = currentPoints - currentMinPoints;
  const pointsNeededForNextTier = nextTier.minPoints - currentMinPoints;
  const progressPercent = Math.round((pointsInCurrentTier / pointsNeededForNextTier) * 100);

  return {
    nextTier: {
      id: nextTier.id,
      name: nextTier.name,
      minPoints: nextTier.minPoints,
      pointsNeeded: nextTier.minPoints - currentPoints,
    },
    progressPercent,
  };
}

/**
 * GET /api/v1/loyalty/cards/:id
 * Get card detail with tier progress and customer info
 */
export const GET = createRouteHandler({
  paramsSchema: cardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Fetch card with program validation
    const [card] = await db
      .select({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        cardNumber: loyaltyCards.cardNumber,
        pointsBalance: loyaltyCards.pointsBalance,
        stampsBalance: loyaltyCards.stampsBalance,
        applePassUrl: loyaltyCards.applePassUrl,
        googlePassUrl: loyaltyCards.googlePassUrl,
        isActive: loyaltyCards.isActive,
        createdAt: loyaltyCards.createdAt,
        updatedAt: loyaltyCards.updatedAt,
        programId: loyaltyCards.programId,
        tierId: loyaltyTiers.id,
        tierName: loyaltyTiers.name,
        tierColor: loyaltyTiers.color,
        tierMinPoints: loyaltyTiers.minPoints,
        tierBenefits: loyaltyTiers.benefits,
        customerUuid: customers.uuid,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(loyaltyCards)
      .innerJoin(customers, eq(loyaltyCards.customerId, customers.id))
      .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
      .leftJoin(loyaltyTiers, eq(loyaltyCards.tierId, loyaltyTiers.id))
      .where(and(eq(loyaltyCards.uuid, params.id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!card) {
      throw new NotFoundError('Loyalty card not found');
    }

    // Calculate tier progress
    const tierProgress = await calculateTierProgress(
      card.id,
      card.pointsBalance ?? 0,
      card.programId,
    );

    return successResponse({
      id: card.id,
      uuid: card.uuid,
      cardNumber: card.cardNumber,
      pointsBalance: card.pointsBalance,
      stampsBalance: card.stampsBalance,
      currentTier: card.tierId
        ? {
            id: card.tierId,
            name: card.tierName!,
            color: card.tierColor!,
            minPoints: card.tierMinPoints!,
            benefits: card.tierBenefits!,
          }
        : null,
      nextTier: tierProgress.nextTier,
      progressPercent: tierProgress.progressPercent,
      customer: {
        uuid: card.customerUuid,
        name: card.customerName,
        email: card.customerEmail,
      },
      applePassUrl: card.applePassUrl,
      googlePassUrl: card.googlePassUrl,
      isActive: card.isActive,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    });
  },
});
