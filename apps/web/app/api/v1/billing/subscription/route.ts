/**
 * GET /api/v1/billing/subscription
 * Get the current subscription for the authenticated user's company.
 *
 * Protected endpoint - requires owner role.
 * Returns current subscription with plan details, status, period dates,
 * next renewal, and plan features from PLAN_CONFIG.
 */

import { PLAN_CONFIG, type SubscriptionPlan, NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { getSubscriptionForCompany } from '@/app/api/v1/billing/service';

/**
 * GET /api/v1/billing/subscription
 * Returns current subscription with computed fields and plan features.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);
    const subscription = await getSubscriptionForCompany(companyId);

    if (!subscription) {
      throw new NotFoundError('No active subscription found — company is on the Free plan');
    }

    // Get plan features from PLAN_CONFIG
    const planKey = subscription.plan as SubscriptionPlan;
    const planConfig = PLAN_CONFIG[planKey];

    return successResponse({
      id: subscription.uuid,
      plan: subscription.plan,
      planName: planConfig?.name || subscription.plan,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      priceAmount: subscription.priceAmount,
      currency: subscription.currency,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      daysUntilRenewal: subscription.daysUntilRenewal,
      pendingDowngrade: subscription.pendingDowngrade,
      features: planConfig?.features || null,
      createdAt: subscription.createdAt,
    });
  },
});
