/**
 * GET /api/v1/billing/plans
 * List all available subscription plans with pricing and features.
 *
 * PUBLIC ENDPOINT - No auth required (visitors can see pricing).
 */

import { PLAN_CONFIG } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';

/**
 * GET /api/v1/billing/plans
 * Returns all 4 plan tiers (free, essential, growth, ai_powered) with pricing.
 */
export const GET = createRouteHandler({
  requiresAuth: false,
  handler: async () => {
    // Transform PLAN_CONFIG record into an array with plan keys
    const plans = Object.entries(PLAN_CONFIG).map(([key, config]) => ({
      key,
      name: config.name,
      price: config.price,
      priceAnnual: config.priceAnnual,
      currency: config.currency,
      features: config.features,
    }));

    return successResponse({ plans });
  },
});
