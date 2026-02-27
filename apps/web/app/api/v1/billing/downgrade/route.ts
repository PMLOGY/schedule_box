/**
 * POST /api/v1/billing/downgrade
 * Schedule a downgrade to a lower plan at the end of the current billing period.
 *
 * Protected endpoint - requires owner role.
 * The plan change does NOT take effect immediately. It is scheduled for the
 * end of the current billing period (handled by the renewal scheduler).
 */

import { z } from 'zod';
import { type SubscriptionPlan } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { downgradeSubscription } from '@/app/api/v1/billing/service';

/** Request body schema */
const downgradeBodySchema = z.object({
  plan: z.enum(['free', 'essential', 'growth']),
});

/**
 * POST /api/v1/billing/downgrade
 * Schedules a downgrade to take effect at period end.
 */
export const POST = createRouteHandler({
  bodySchema: downgradeBodySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);
    const { plan } = body;

    const result = await downgradeSubscription(companyId, plan as SubscriptionPlan);

    return successResponse({
      subscription: {
        id: result.uuid,
        plan: result.plan,
        status: result.status,
        cancelAtPeriodEnd: result.cancelAtPeriodEnd,
        currentPeriodEnd: result.currentPeriodEnd,
      },
      pendingDowngrade: result.pendingDowngrade,
    });
  },
});
