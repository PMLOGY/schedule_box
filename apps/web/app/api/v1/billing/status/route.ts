/**
 * GET /api/v1/billing/status
 * Polling endpoint for frontend after Comgate payment redirect.
 *
 * Protected endpoint - requires owner role.
 * Designed to be called every 1-2 seconds for up to 10 seconds after
 * the user returns from the Comgate payment page.
 *
 * Returns the latest subscription status and activation state.
 */

import { eq, desc } from 'drizzle-orm';
import { db, subscriptions, subscriptionEvents } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { PLAN_CONFIG, type SubscriptionPlan } from '@schedulebox/shared';

/**
 * GET /api/v1/billing/status
 * Returns current subscription status for payment polling.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);

    // Get latest subscription for company (any status, ordered by creation)
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        uuid: subscriptions.uuid,
        plan: subscriptions.plan,
        status: subscriptions.status,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .where(eq(subscriptions.companyId, companyId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription) {
      return successResponse({
        subscriptionStatus: null,
        planName: 'Free',
        activated: false,
        lastEventType: null,
      });
    }

    // Get the latest subscription event
    const [latestEvent] = await db
      .select({
        eventType: subscriptionEvents.eventType,
        createdAt: subscriptionEvents.createdAt,
      })
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.subscriptionId, subscription.id))
      .orderBy(desc(subscriptionEvents.createdAt))
      .limit(1);

    const planKey = subscription.plan as SubscriptionPlan;
    const planConfig = PLAN_CONFIG[planKey];

    return successResponse({
      subscriptionStatus: subscription.status,
      planName: planConfig?.name || subscription.plan,
      activated: subscription.status === 'active',
      lastEventType: latestEvent?.eventType || null,
    });
  },
});
