/**
 * Smart Upselling Recommendations Endpoint
 * POST /api/v1/ai/optimization/upselling
 *
 * Returns AI-powered upselling recommendations during booking flow.
 * Uses circuit breaker: returns empty recommendations (200) when AI unavailable.
 * Optimization is advisory - never blocks booking.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { predictUpselling } from '@/lib/ai/client';
import { getUpsellFallback } from '@/lib/ai/fallback';
import { upsellRequestSchema } from '@schedulebox/shared';

/**
 * POST /api/v1/ai/optimization/upselling
 * Get smart upselling recommendations for a service selection.
 * Permission: bookings.read (accessible during booking flow).
 * Returns 200 with fallback on AI failure (non-critical, advisory).
 */
export const POST = createRouteHandler({
  bodySchema: upsellRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ body }) => {
    try {
      const prediction = await predictUpselling.fire(body);
      return successResponse(prediction);
    } catch {
      // Optimization is advisory - return 200 with fallback
      const fallback = getUpsellFallback(body);
      return successResponse(fallback);
    }
  },
});
