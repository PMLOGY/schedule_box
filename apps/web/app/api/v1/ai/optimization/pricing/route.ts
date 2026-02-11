/**
 * Dynamic Pricing Optimization Endpoint
 * POST /api/v1/ai/optimization/pricing
 *
 * Returns AI-powered optimal price for a service in a given context.
 * Uses circuit breaker: returns midpoint price (200) when AI unavailable.
 * Optimization is advisory - pricing suggestions only.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { predictDynamicPricing } from '@/lib/ai/client';
import { getDynamicPricingFallback } from '@/lib/ai/fallback';
import { dynamicPricingRequestSchema } from '@schedulebox/shared';

/**
 * POST /api/v1/ai/optimization/pricing
 * Get optimal dynamic price for a service.
 * Permission: services.update (admin pricing control).
 * Returns 200 with fallback on AI failure (advisory).
 */
export const POST = createRouteHandler({
  bodySchema: dynamicPricingRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_UPDATE],
  handler: async ({ body }) => {
    try {
      const prediction = await predictDynamicPricing.fire(body);
      return successResponse(prediction);
    } catch {
      // Optimization is advisory - return 200 with fallback
      const fallback = getDynamicPricingFallback(body);
      return successResponse(fallback);
    }
  },
});
