/**
 * POST /api/v1/billing/upgrade
 * Upgrade the current subscription to a higher plan.
 *
 * Protected endpoint - requires owner role.
 *
 * Response depends on whether proration was charged server-side:
 * - charged: true — proration was charged via chargeRecurringPayment (no redirect)
 * - charged: false + redirectUrl — user must complete payment at Comgate
 * - charged: true + prorationAmount: 0 — no proration (e.g., upgrading during trial)
 */

import { z } from 'zod';
import { type SubscriptionPlan } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { upgradeSubscription } from '@/app/api/v1/billing/service';

/** Request body schema */
const upgradeBodySchema = z.object({
  plan: z.enum(['essential', 'growth', 'ai_powered']),
});

/**
 * POST /api/v1/billing/upgrade
 * Upgrades to a higher plan with proration handling.
 */
export const POST = createRouteHandler({
  bodySchema: upgradeBodySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);
    const { plan } = body;

    const result = await upgradeSubscription(companyId, plan as SubscriptionPlan);

    if (result.comgateRedirectUrl) {
      // User must complete payment at Comgate (no recurring token exists)
      return successResponse({
        redirectUrl: result.comgateRedirectUrl,
        prorationAmount: result.prorationAmount,
        charged: false,
      });
    }

    // Proration was charged server-side or no proration needed
    return successResponse({
      subscription: {
        id: result.subscription.uuid,
        plan: result.subscription.plan,
        status: result.subscription.status,
        priceAmount: result.subscription.priceAmount,
      },
      prorationAmount: result.prorationAmount,
      charged: result.charged,
    });
  },
});
