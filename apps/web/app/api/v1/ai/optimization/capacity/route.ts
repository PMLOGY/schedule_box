/**
 * Capacity Demand Forecasting Endpoint
 * POST /api/v1/ai/optimization/capacity
 *
 * Returns AI-powered capacity forecast for the next N days.
 * Uses circuit breaker: returns empty forecast (200) when AI unavailable.
 * Optimization is advisory - dashboard planning only.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { predictCapacityForecast } from '@/lib/ai/client';
import { getCapacityForecastFallback } from '@/lib/ai/fallback';
import { capacityForecastRequestSchema } from '@schedulebox/shared';

/**
 * POST /api/v1/ai/optimization/capacity
 * Get capacity demand forecast for planning.
 * Permission: settings.manage (admin dashboard).
 * Returns 200 with fallback on AI failure (advisory).
 */
export const POST = createRouteHandler({
  bodySchema: capacityForecastRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body }) => {
    try {
      const prediction = await predictCapacityForecast.fire(body);
      return successResponse(prediction);
    } catch {
      // Optimization is advisory - return 200 with fallback
      const fallback = getCapacityForecastFallback(body);
      return successResponse(fallback);
    }
  },
});
