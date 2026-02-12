/**
 * AI Follow-Up Email Generation Endpoint
 * POST /api/v1/ai/follow-up
 *
 * Generates personalized follow-up email content using GPT-4o-mini.
 * Accepts customer context and template type, returns subject + body in Czech.
 * Uses circuit breaker: returns empty content (200) when AI unavailable.
 * Non-critical, advisory -- never blocks other operations.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { generateFollowUp } from '@/lib/ai/client';
import { getFollowUpFallback } from '@/lib/ai/fallback';
import { followUpRequestSchema } from '@schedulebox/shared';

/**
 * POST /api/v1/ai/follow-up
 * Generate personalized follow-up email for a customer.
 * Permission: settings.manage (admin/owner feature, not customer-facing).
 * Returns 200 with fallback on AI failure (non-critical, advisory).
 *
 * company_id is injected from the authenticated user's JWT token,
 * NOT from the request body. This prevents users from generating
 * follow-ups for other companies (tenant isolation).
 */
export const POST = createRouteHandler({
  bodySchema: followUpRequestSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    try {
      // Inject company_id from auth context (not from body) for tenant isolation
      const request = { ...body, company_id: user!.company_id };
      const result = await generateFollowUp.fire(request);
      return successResponse(result);
    } catch {
      // Follow-up is advisory -- return 200 with fallback
      const fallback = getFollowUpFallback({
        ...body,
        company_id: user?.company_id ?? 0,
      });
      return successResponse(fallback);
    }
  },
});
