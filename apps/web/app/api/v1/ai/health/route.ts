/**
 * AI Service Health Status Endpoint
 * GET /api/v1/ai/health - Report AI service health and circuit breaker state
 *
 * Admin-level endpoint for monitoring AI service availability.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { getAIServiceStatus } from '@/lib/ai/client';

/**
 * GET /api/v1/ai/health
 * Returns AI service health status including circuit breaker state and stats.
 * Requires settings.manage permission (admin-level access).
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async () => {
    const health = getAIServiceStatus();
    return successResponse(health);
  },
});
