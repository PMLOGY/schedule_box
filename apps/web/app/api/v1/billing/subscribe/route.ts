// NOTE: Subscription billing intentionally uses platform Comgate credentials (PAY-04).
// Do NOT pass per-company credentials here.

/**
 * POST /api/v1/billing/subscribe
 * Initiate a new subscription with Comgate recurring payment.
 *
 * Protected endpoint - requires owner role.
 * Creates a trialing subscription and redirects to Comgate for initial payment.
 */

import { z } from 'zod';
import { type SubscriptionPlan, type BillingCycle } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { createSubscription } from '@/app/api/v1/billing/service';
import { initComgatePayment } from '@/app/api/v1/payments/comgate/client';
import { db, subscriptions } from '@schedulebox/database';
import { eq } from 'drizzle-orm';

/** Request body schema */
const subscribeBodySchema = z.object({
  plan: z.enum(['essential', 'growth', 'ai_powered']),
  billingCycle: z.enum(['monthly', 'annual']).optional().default('monthly'),
});

/**
 * POST /api/v1/billing/subscribe
 * Creates subscription in trialing state and returns Comgate redirect URL.
 */
export const POST = createRouteHandler({
  bodySchema: subscribeBodySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);
    const { plan, billingCycle } = body;

    // Create subscription in trialing state
    const subscription = await createSubscription(
      companyId,
      plan as SubscriptionPlan,
      billingCycle as BillingCycle,
    );

    // Initiate Comgate payment with recurring token creation
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get company email from JWT or fallback
    const companyEmail = user.sub ? `billing-${user.sub}@schedulebox.cz` : 'billing@schedulebox.cz';

    const comgateResult = await initComgatePayment({
      price: Number(subscription.priceAmount),
      currency: subscription.currency || 'CZK',
      label: `ScheduleBox ${plan} subscription`,
      refId: `sub-${subscription.uuid}`,
      email: companyEmail,
      redirectUrl: `${baseUrl}/settings/billing?payment=pending`,
      callbackUrl: `${baseUrl}/api/v1/billing/webhook`,
      initRecurring: true,
    });

    // Store the initial Comgate transaction ID on subscription
    await db
      .update(subscriptions)
      .set({
        comgateInitTransactionId: comgateResult.transactionId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    return successResponse({
      redirectUrl: comgateResult.redirectUrl,
      subscriptionUuid: subscription.uuid,
    });
  },
});
