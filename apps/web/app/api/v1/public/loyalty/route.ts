/**
 * Public Loyalty Lookup Endpoint
 * GET /api/v1/public/loyalty?email=x@y.com&company_slug=salon-krasy
 *
 * No auth required. Returns loyalty card status and available rewards for a
 * given customer email + company slug. Used by the booking wizard to show
 * loyalty info to returning customers before completing a booking.
 */

import { eq, and, lte, isNull } from 'drizzle-orm';
import {
  db,
  companies,
  customers,
  loyaltyCards,
  loyaltyPrograms,
  rewards,
} from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { NotFoundError } from '@schedulebox/shared';
import { successResponse } from '@/lib/utils/response';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const loyaltyQuerySchema = z.object({
  email: z.string().email('Invalid email address'),
  company_slug: z.string().min(1, 'Company slug is required'),
});

// ============================================================================
// GET /api/v1/public/loyalty
// ============================================================================

export const GET = createRouteHandler<undefined, undefined>({
  requiresAuth: false,
  handler: async ({ req }) => {
    const url = new URL(req.url);
    const rawQuery = {
      email: url.searchParams.get('email') ?? '',
      company_slug: url.searchParams.get('company_slug') ?? '',
    };

    // Validate query params
    const parsed = loyaltyQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Invalid query parameters';
      throw new NotFoundError(firstError);
    }

    const { email, company_slug } = parsed.data;

    // Resolve company by slug
    const [company] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, company_slug))
      .limit(1);

    if (!company) {
      return successResponse({
        has_card: false,
        points_balance: 0,
        available_rewards: [],
      });
    }

    const companyId = company.id;

    // Find customer by email + companyId
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.email, email),
          eq(customers.companyId, companyId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);

    if (!customer) {
      return successResponse({
        has_card: false,
        points_balance: 0,
        available_rewards: [],
      });
    }

    // Find active loyalty program for company
    const [program] = await db
      .select({ id: loyaltyPrograms.id })
      .from(loyaltyPrograms)
      .where(and(eq(loyaltyPrograms.companyId, companyId), eq(loyaltyPrograms.isActive, true)))
      .limit(1);

    if (!program) {
      return successResponse({
        has_card: false,
        points_balance: 0,
        available_rewards: [],
      });
    }

    // Find loyalty card for customer + program
    const [card] = await db
      .select({
        id: loyaltyCards.id,
        pointsBalance: loyaltyCards.pointsBalance,
        isActive: loyaltyCards.isActive,
      })
      .from(loyaltyCards)
      .where(and(eq(loyaltyCards.programId, program.id), eq(loyaltyCards.customerId, customer.id)))
      .limit(1);

    if (!card || !card.isActive) {
      return successResponse({
        has_card: false,
        points_balance: 0,
        available_rewards: [],
      });
    }

    const pointsBalance = card.pointsBalance ?? 0;

    // Fetch available rewards: active and affordable (points_cost <= balance)
    const candidateRewards = await db
      .select({
        id: rewards.id,
        name: rewards.name,
        pointsCost: rewards.pointsCost,
        rewardType: rewards.rewardType,
        rewardValue: rewards.rewardValue,
        maxRedemptions: rewards.maxRedemptions,
        currentRedemptions: rewards.currentRedemptions,
      })
      .from(rewards)
      .where(
        and(
          eq(rewards.programId, program.id),
          eq(rewards.isActive, true),
          lte(rewards.pointsCost, pointsBalance),
        ),
      );

    // Filter out exhausted rewards (max_redemptions reached)
    const filteredRewards = candidateRewards.filter(
      (r) => r.maxRedemptions === null || (r.currentRedemptions ?? 0) < r.maxRedemptions,
    );

    return successResponse({
      has_card: true,
      points_balance: pointsBalance,
      available_rewards: filteredRewards.map((r) => ({
        id: r.id,
        name: r.name,
        points_cost: r.pointsCost,
        reward_type: r.rewardType,
        reward_value: r.rewardValue ? parseFloat(r.rewardValue) : null,
      })),
    });
  },
});
