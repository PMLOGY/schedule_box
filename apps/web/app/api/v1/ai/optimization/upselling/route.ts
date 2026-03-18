/**
 * Smart Upselling Recommendations Endpoint
 * POST /api/v1/ai/optimization/upselling
 *
 * Returns AI-powered upselling recommendations during booking flow.
 * Uses circuit breaker: returns empty recommendations (200) when AI unavailable.
 * Optimization is advisory - never blocks booking.
 *
 * Gate: returns empty recommendations when industry_config.ai.upselling_enabled is false.
 */

import { eq } from 'drizzle-orm';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { predictUpselling } from '@/lib/ai/client';
import { getUpsellFallback } from '@/lib/ai/fallback';
import { upsellRequestSchema } from '@schedulebox/shared';
import { db, companies } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { getIndustryAiDefaults } from '@/lib/industry/industry-ai-defaults';

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
  handler: async ({ body, user }) => {
    // Gate: check if upselling is enabled for company's industry
    try {
      const { companyId } = await findCompanyId(user!.sub);
      const [company] = await db
        .select({ industryType: companies.industryType, industryConfig: companies.industryConfig })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (company) {
        const industryType = company.industryType ?? 'general';
        const defaults = getIndustryAiDefaults(industryType);
        const storedAi = ((company.industryConfig as Record<string, unknown> | null)?.ai ??
          {}) as Record<string, unknown>;
        const upsellingEnabled = storedAi.upselling_enabled ?? defaults.upselling_enabled;

        if (upsellingEnabled === false) {
          // Industry config disables upselling — return empty, non-blocking
          return successResponse({ recommendations: [], fallback: false });
        }
      }
    } catch {
      // Auth/DB errors are non-critical for this advisory endpoint — proceed normally
    }

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
