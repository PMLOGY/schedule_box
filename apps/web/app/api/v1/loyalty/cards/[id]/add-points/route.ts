/**
 * Add Points to Loyalty Card Endpoint
 * POST /api/v1/loyalty/cards/:id/add-points - Manually add points to a card
 *
 * Validates card ownership via program -> companyId, then delegates to points engine.
 */

import { eq, and } from 'drizzle-orm';
import { db, loyaltyCards, loyaltyPrograms, loyaltyTiers, customers } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { addPointsSchema } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { earnPoints } from '@/lib/loyalty/points-engine';
import { z } from 'zod';

// Params schema for card UUID
const cardIdParamSchema = z.object({
  id: z.string().uuid('Invalid card ID format'),
});

/**
 * POST /api/v1/loyalty/cards/:id/add-points
 * Manually add points to a loyalty card
 *
 * - Validates card UUID and ownership via program -> companyId
 * - Calls earnPoints from points engine (handles locking, events, tier upgrade)
 * - Returns updated card with tier progress
 */
export const POST = createRouteHandler({
  bodySchema: addPointsSchema,
  paramsSchema: cardIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.LOYALTY_MANAGE],
  handler: async ({ body, params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Look up card by UUID, validate ownership via program -> companyId
    const [card] = await db
      .select({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        programId: loyaltyCards.programId,
      })
      .from(loyaltyCards)
      .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
      .where(and(eq(loyaltyCards.uuid, params.id), eq(loyaltyPrograms.companyId, companyId)))
      .limit(1);

    if (!card) {
      throw new NotFoundError('Loyalty card not found');
    }

    // Add points via engine (handles locking, transaction record, events, tier upgrade)
    const description = body.description || 'Manual adjustment';
    await earnPoints(card.id, body.points, description);

    // Fetch updated card with tier progress for response
    const [updatedCard] = await db
      .select({
        id: loyaltyCards.id,
        uuid: loyaltyCards.uuid,
        cardNumber: loyaltyCards.cardNumber,
        pointsBalance: loyaltyCards.pointsBalance,
        stampsBalance: loyaltyCards.stampsBalance,
        isActive: loyaltyCards.isActive,
        createdAt: loyaltyCards.createdAt,
        updatedAt: loyaltyCards.updatedAt,
        programId: loyaltyCards.programId,
        tierId: loyaltyTiers.id,
        tierName: loyaltyTiers.name,
        tierColor: loyaltyTiers.color,
        tierMinPoints: loyaltyTiers.minPoints,
        customerUuid: customers.uuid,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(loyaltyCards)
      .innerJoin(customers, eq(loyaltyCards.customerId, customers.id))
      .innerJoin(loyaltyPrograms, eq(loyaltyCards.programId, loyaltyPrograms.id))
      .leftJoin(loyaltyTiers, eq(loyaltyCards.tierId, loyaltyTiers.id))
      .where(eq(loyaltyCards.id, card.id))
      .limit(1);

    if (!updatedCard) {
      throw new NotFoundError('Loyalty card not found after update');
    }

    // Calculate tier progress
    const allTiers = await db
      .select({
        id: loyaltyTiers.id,
        name: loyaltyTiers.name,
        minPoints: loyaltyTiers.minPoints,
      })
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.programId, updatedCard.programId))
      .orderBy(loyaltyTiers.minPoints);

    const currentPoints = updatedCard.pointsBalance ?? 0;
    let nextTier: { id: number; name: string; minPoints: number; pointsNeeded: number } | null =
      null;
    let progressPercent = 0;

    if (allTiers.length > 0) {
      const next = allTiers.find((tier) => tier.minPoints > currentPoints);
      if (!next) {
        progressPercent = 100;
      } else {
        const currentTier = [...allTiers].reverse().find((tier) => tier.minPoints <= currentPoints);
        const currentMinPoints = currentTier?.minPoints ?? 0;
        const pointsInCurrentTier = currentPoints - currentMinPoints;
        const pointsNeededForNextTier = next.minPoints - currentMinPoints;
        progressPercent = Math.round((pointsInCurrentTier / pointsNeededForNextTier) * 100);
        nextTier = {
          id: next.id,
          name: next.name,
          minPoints: next.minPoints,
          pointsNeeded: next.minPoints - currentPoints,
        };
      }
    }

    return successResponse({
      id: updatedCard.id,
      uuid: updatedCard.uuid,
      cardNumber: updatedCard.cardNumber,
      pointsBalance: updatedCard.pointsBalance,
      stampsBalance: updatedCard.stampsBalance,
      currentTier: updatedCard.tierId
        ? {
            id: updatedCard.tierId,
            name: updatedCard.tierName!,
            color: updatedCard.tierColor!,
            minPoints: updatedCard.tierMinPoints!,
          }
        : null,
      nextTier,
      progressPercent,
      customer: {
        uuid: updatedCard.customerUuid,
        name: updatedCard.customerName,
        email: updatedCard.customerEmail,
      },
      isActive: updatedCard.isActive,
      createdAt: updatedCard.createdAt,
      updatedAt: updatedCard.updatedAt,
    });
  },
});
