/**
 * Subscription Billing Service Layer
 *
 * Business logic for subscription lifecycle operations:
 * - Create subscriptions (trialing state)
 * - State machine transitions with validation
 * - Activate subscriptions on first payment
 * - Upgrade (immediate with proration) and downgrade (end-of-period)
 * - Webhook processing with idempotency
 * - Subscription queries
 *
 * All state transitions go through transitionSubscriptionStatus.
 * All webhook processing uses SELECT FOR UPDATE on the subscription row.
 */

import { eq, and, ne, desc } from 'drizzle-orm';
import { db, dbTx, subscriptions, subscriptionEvents, companies } from '@schedulebox/database';
import {
  type SubscriptionPlan,
  type SubscriptionStatus,
  type BillingCycle,
  PLAN_CONFIG,
  VALID_SUBSCRIPTION_TRANSITIONS,
  calculateProration,
  getPlanPrice,
  ValidationError,
  ConflictError,
  NotFoundError,
  AppError,
} from '@schedulebox/shared';
import { chargeRecurringPayment, initComgatePayment } from '@/app/api/v1/payments/comgate/client';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Plan tier ordering for upgrade/downgrade validation */
const PLAN_TIER_ORDER: Record<SubscriptionPlan, number> = {
  free: 0,
  essential: 1,
  growth: 2,
  ai_powered: 3,
};

// ============================================================================
// CREATE SUBSCRIPTION
// ============================================================================

/**
 * Create a new subscription in trialing state.
 *
 * @param companyId Internal company ID
 * @param plan Target subscription plan (cannot be 'free')
 * @param billingCycle Monthly or annual billing
 * @returns The created subscription record
 * @throws ValidationError if plan is 'free'
 * @throws ConflictError if company already has an active/trialing subscription
 */
export async function createSubscription(
  companyId: number,
  plan: SubscriptionPlan,
  billingCycle: BillingCycle = 'monthly',
) {
  // Cannot subscribe to free plan
  if (plan === 'free') {
    throw new ValidationError('Cannot subscribe to free plan');
  }

  // Check for existing active/trialing subscription
  const [existing] = await db
    .select({ id: subscriptions.id, status: subscriptions.status })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.companyId, companyId),
        ne(subscriptions.status, 'expired'),
        ne(subscriptions.status, 'cancelled'),
      ),
    )
    .limit(1);

  if (existing) {
    throw new ConflictError('Company already has an active or trialing subscription');
  }

  // Calculate price and period
  const price = getPlanPrice(plan, billingCycle);
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'annual') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setDate(periodEnd.getDate() + 30);
  }

  // Insert subscription
  const [subscription] = await db
    .insert(subscriptions)
    .values({
      companyId,
      plan,
      status: 'trialing',
      billingCycle,
      priceAmount: price.toFixed(2),
      currency: 'CZK',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart: now,
      trialEnd: periodEnd,
    })
    .returning();

  return subscription;
}

// ============================================================================
// TRANSITION SUBSCRIPTION STATUS
// ============================================================================

/**
 * Transition subscription status with state machine validation.
 *
 * Uses SELECT FOR UPDATE to lock the subscription row.
 * Validates transition against VALID_SUBSCRIPTION_TRANSITIONS.
 * Inserts audit event into subscription_events.
 *
 * @param subscriptionId Internal subscription ID
 * @param newStatus Target status
 * @param tx Optional existing transaction (for use within larger transactions)
 * @returns Updated subscription record
 * @throws NotFoundError if subscription not found
 * @throws ValidationError if transition is invalid
 */
export async function transitionSubscriptionStatus(
  subscriptionId: number,
  newStatus: SubscriptionStatus,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doTransition = async (txInner: any) => {
    // Lock subscription row
    const [subscription] = await txInner
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .for('update')
      .limit(1);

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const currentStatus = subscription.status as SubscriptionStatus;
    const allowedTransitions = VALID_SUBSCRIPTION_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Invalid subscription status transition from '${currentStatus}' to '${newStatus}'`,
      );
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Status-specific side effects
    if (newStatus === 'active') {
      const now = new Date();
      const periodEnd = new Date(now);
      if (subscription.billingCycle === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setDate(periodEnd.getDate() + 30);
      }
      updateValues.currentPeriodStart = now;
      updateValues.currentPeriodEnd = periodEnd;
    }

    if (newStatus === 'past_due') {
      updateValues.dunningStartedAt = new Date();
    }

    if (newStatus === 'expired') {
      // Reset company to free plan
      await txInner
        .update(companies)
        .set({
          subscriptionPlan: 'free',
          subscriptionValidUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, subscription.companyId));
    }

    // Update subscription
    const [updated] = await txInner
      .update(subscriptions)
      .set(updateValues)
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    // Insert audit event
    await txInner.insert(subscriptionEvents).values({
      subscriptionId,
      eventType: `status.${newStatus}`,
      previousStatus: currentStatus,
      newStatus,
      metadata: {},
    });

    return updated;
  };

  // If we already have an outer transaction, use it directly
  if (tx) {
    return doTransition(tx);
  }

  // Otherwise create a new transaction
  return dbTx.transaction(async (newTx) => doTransition(newTx));
}

// ============================================================================
// ACTIVATE SUBSCRIPTION
// ============================================================================

/**
 * Activate a subscription on first payment success.
 *
 * Called by the webhook handler when the initial payment is confirmed.
 * - Transitions status to 'active'
 * - Stores the Comgate transaction ID for future recurring charges
 * - Updates company plan and validity
 *
 * @param subscriptionId Internal subscription ID
 * @param comgateTransactionId The Comgate transId for future recurring charges
 * @returns Updated subscription
 */
export async function activateSubscription(subscriptionId: number, comgateTransactionId: string) {
  return dbTx.transaction(async (tx) => {
    // Transition to active (handles locking and validation)
    const updated = await transitionSubscriptionStatus(subscriptionId, 'active', tx);

    // Store the recurring token
    await tx
      .update(subscriptions)
      .set({
        comgateInitTransactionId: comgateTransactionId,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId));

    // Update company plan and validity
    await tx
      .update(companies)
      .set({
        subscriptionPlan: updated.plan as SubscriptionPlan,
        subscriptionValidUntil: updated.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, updated.companyId));

    return updated;
  });
}

// ============================================================================
// UPGRADE SUBSCRIPTION
// ============================================================================

/**
 * Upgrade a company's subscription to a higher plan.
 *
 * Proration is charged based on remaining days in current period:
 * - If subscriber has existing recurring token: charges via chargeRecurringPayment
 *   (server-side, no redirect needed)
 * - If no recurring token (e.g., upgrading during trial): uses initComgatePayment
 *   with initRecurring=true (redirect-based payment)
 *
 * @param companyId Internal company ID
 * @param newPlan Target plan (must be higher tier)
 * @returns Subscription, proration amount, charge result, and optional redirect URL
 */
export async function upgradeSubscription(companyId: number, newPlan: SubscriptionPlan) {
  // Find active/trialing subscription
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.companyId, companyId),
        ne(subscriptions.status, 'expired'),
        ne(subscriptions.status, 'cancelled'),
      ),
    )
    .limit(1);

  if (!subscription) {
    throw new ValidationError('No active subscription found');
  }

  const oldPlan = subscription.plan as SubscriptionPlan;

  // Validate upgrade direction
  if (PLAN_TIER_ORDER[newPlan] <= PLAN_TIER_ORDER[oldPlan]) {
    throw new ValidationError(
      `Cannot upgrade from '${oldPlan}' to '${newPlan}' — target plan must be a higher tier`,
    );
  }

  // Calculate proration
  const oldPrice = PLAN_CONFIG[oldPlan].price;
  const newPrice = PLAN_CONFIG[newPlan].price;
  const prorationAmount = calculateProration(oldPrice, newPrice, subscription.currentPeriodEnd);

  // Get company email for Comgate
  const [company] = await db
    .select({ email: companies.email })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  const companyEmail = company?.email || '';

  let charged = false;
  let comgateRedirectUrl: string | undefined;

  // Charge proration if applicable
  if (prorationAmount > 0) {
    if (subscription.comgateInitTransactionId) {
      // Server-side charge using existing recurring token — no redirect needed
      const chargeResult = await chargeRecurringPayment({
        initRecurringId: subscription.comgateInitTransactionId,
        price: prorationAmount,
        currency: subscription.currency || 'CZK',
        label: `ScheduleBox upgrade ${oldPlan} -> ${newPlan} proration`,
        refId: `upgrade-${subscription.uuid}-${Date.now()}`,
        email: companyEmail,
      });

      if (chargeResult.code !== '0') {
        throw new AppError('PAYMENT_FAILED', 'Payment failed for upgrade proration', 402, {
          comgateCode: chargeResult.code,
          message: chargeResult.message,
        });
      }

      charged = true;

      // Log the proration charge event
      await db.insert(subscriptionEvents).values({
        subscriptionId: subscription.id,
        eventType: 'proration.charged',
        comgateTransactionId: chargeResult.transactionId,
        metadata: {
          oldPlan,
          newPlan,
          amount: prorationAmount,
          chargeType: 'recurring',
        },
      });
    } else {
      // No recurring token — redirect to Comgate for payment
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const paymentResult = await initComgatePayment({
        price: prorationAmount,
        currency: subscription.currency || 'CZK',
        label: `ScheduleBox upgrade ${oldPlan} -> ${newPlan} proration`,
        refId: `upgrade-${subscription.uuid}-${Date.now()}`,
        email: companyEmail,
        redirectUrl: `${baseUrl}/settings/billing?payment=pending`,
        callbackUrl: `${baseUrl}/api/v1/billing/webhook`,
        initRecurring: true,
      });

      comgateRedirectUrl = paymentResult.redirectUrl;
      charged = false;
    }
  } else {
    // No proration (e.g., zero cost difference or upgrading at period boundary)
    charged = true;
  }

  // Update subscription plan immediately (for both charged and redirect cases)
  const newPlanPrice = getPlanPrice(newPlan, subscription.billingCycle as BillingCycle);
  const [updated] = await db
    .update(subscriptions)
    .set({
      plan: newPlan,
      priceAmount: newPlanPrice.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning();

  // Update company plan
  await db
    .update(companies)
    .set({
      subscriptionPlan: newPlan,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  // Log upgrade event
  await db.insert(subscriptionEvents).values({
    subscriptionId: subscription.id,
    eventType: 'plan.upgraded',
    metadata: {
      oldPlan,
      newPlan,
      prorationAmount,
      charged,
    },
  });

  return {
    subscription: updated,
    prorationAmount,
    charged,
    comgateRedirectUrl,
  };
}

// ============================================================================
// DOWNGRADE SUBSCRIPTION
// ============================================================================

/**
 * Schedule a downgrade to a lower plan at the end of the current billing period.
 *
 * Does NOT change the plan immediately — the downgrade takes effect when the
 * current period ends (handled by the renewal scheduler in Plan 03).
 *
 * @param companyId Internal company ID
 * @param newPlan Target plan (must be lower tier, can be 'free')
 * @returns Updated subscription with pending downgrade info
 */
export async function downgradeSubscription(companyId: number, newPlan: SubscriptionPlan) {
  // Find active subscription
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.companyId, companyId),
        ne(subscriptions.status, 'expired'),
        ne(subscriptions.status, 'cancelled'),
      ),
    )
    .limit(1);

  if (!subscription) {
    throw new ValidationError('No active subscription found');
  }

  const oldPlan = subscription.plan as SubscriptionPlan;

  // Validate downgrade direction
  if (PLAN_TIER_ORDER[newPlan] >= PLAN_TIER_ORDER[oldPlan]) {
    throw new ValidationError(
      `Cannot downgrade from '${oldPlan}' to '${newPlan}' — target plan must be a lower tier`,
    );
  }

  // Mark subscription for downgrade at period end
  const [updated] = await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id))
    .returning();

  // Log downgrade schedule event with pending plan info in metadata
  await db.insert(subscriptionEvents).values({
    subscriptionId: subscription.id,
    eventType: 'plan.downgrade_scheduled',
    metadata: {
      currentPlan: oldPlan,
      pendingPlan: newPlan,
      effectiveAt: subscription.currentPeriodEnd,
    },
  });

  return {
    ...updated,
    pendingDowngrade: newPlan,
  };
}

// ============================================================================
// PROCESS SUBSCRIPTION WEBHOOK
// ============================================================================

/**
 * Process a Comgate webhook for subscription payments.
 *
 * Handles idempotency via subscription_events table.
 * Uses SELECT FOR UPDATE on the subscription row.
 *
 * @param comgateTransactionId Comgate transaction ID
 * @param status Comgate payment status (PAID, CANCELLED, etc.)
 * @param payload Raw webhook payload for audit
 */
export async function processSubscriptionWebhook(
  comgateTransactionId: string,
  status: string,
  payload: Record<string, unknown>,
) {
  // Idempotency check: look for existing event with this transactionId
  const { alreadyProcessed } = await checkSubscriptionEventIdempotency(comgateTransactionId);
  if (alreadyProcessed) {
    return { alreadyProcessed: true };
  }

  return dbTx.transaction(async (tx) => {
    // Find subscription by comgateInitTransactionId (recurring token)
    // or by matching a refId pattern in subscription_events metadata
    let [subscription] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.comgateInitTransactionId, comgateTransactionId))
      .for('update')
      .limit(1);

    // If not found by init transaction, try to find by refId in the payload
    if (!subscription && payload.refId) {
      const refId = String(payload.refId);
      // Extract subscription UUID from refId patterns like "upgrade-{uuid}-{timestamp}"
      // or from the subscription UUID directly if it was used as refId
      const uuidMatch = refId.match(
        /(?:upgrade-|sub-)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
      );
      if (uuidMatch) {
        [subscription] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.uuid, uuidMatch[1]))
          .for('update')
          .limit(1);
      }
    }

    if (!subscription) {
      console.warn(
        `[Billing Webhook] No subscription found for Comgate transaction ${comgateTransactionId}`,
      );
      return { alreadyProcessed: false, subscriptionFound: false };
    }

    if (status === 'PAID') {
      const currentStatus = subscription.status as SubscriptionStatus;

      if (currentStatus === 'trialing') {
        // First payment — activate subscription
        await activateSubscriptionInTx(tx, subscription.id, comgateTransactionId);
      } else if (currentStatus === 'active' || currentStatus === 'past_due') {
        // Renewal payment — extend period
        const now = new Date();
        const newPeriodEnd = new Date(now);
        if (subscription.billingCycle === 'annual') {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        } else {
          newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);
        }

        await tx
          .update(subscriptions)
          .set({
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: newPeriodEnd,
            dunningStartedAt: null,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, subscription.id));

        // Update company validity
        await tx
          .update(companies)
          .set({
            subscriptionValidUntil: newPeriodEnd,
            updatedAt: now,
          })
          .where(eq(companies.id, subscription.companyId));
      }

      // Log payment success event
      await tx.insert(subscriptionEvents).values({
        subscriptionId: subscription.id,
        eventType: 'payment.success',
        comgateTransactionId,
        previousStatus: subscription.status,
        newStatus: 'active',
        metadata: payload,
      });
    } else if (status === 'CANCELLED' || status === 'FAILED') {
      const currentStatus = subscription.status as SubscriptionStatus;

      if (currentStatus === 'active') {
        // Payment failed on active subscription — enter dunning
        await transitionSubscriptionStatus(subscription.id, 'past_due', tx);
      } else if (currentStatus === 'past_due') {
        // Already in dunning and another payment failed — may expire
        // (Expiry is handled by the renewal scheduler based on dunningStartedAt)
      }

      // Log payment failure event
      await tx.insert(subscriptionEvents).values({
        subscriptionId: subscription.id,
        eventType: 'payment.failed',
        comgateTransactionId,
        previousStatus: subscription.status,
        newStatus: subscription.status,
        metadata: payload,
      });
    }

    return { alreadyProcessed: false, subscriptionFound: true };
  });
}

// ============================================================================
// GET SUBSCRIPTION FOR COMPANY
// ============================================================================

/**
 * Get the current (non-expired) subscription for a company.
 *
 * @param companyId Internal company ID
 * @returns Subscription with computed fields, or null if on free plan
 */
export async function getSubscriptionForCompany(companyId: number) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.companyId, companyId), ne(subscriptions.status, 'expired')))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!subscription) {
    return null;
  }

  // Compute additional fields
  const now = new Date();
  const msInDay = 1000 * 60 * 60 * 24;
  const daysUntilRenewal = Math.max(
    0,
    Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / msInDay),
  );

  // Check for pending downgrade in recent events
  const [downgradeEvent] = await db
    .select({ metadata: subscriptionEvents.metadata })
    .from(subscriptionEvents)
    .where(
      and(
        eq(subscriptionEvents.subscriptionId, subscription.id),
        eq(subscriptionEvents.eventType, 'plan.downgrade_scheduled'),
      ),
    )
    .orderBy(desc(subscriptionEvents.createdAt))
    .limit(1);

  const pendingDowngrade =
    subscription.cancelAtPeriodEnd && downgradeEvent?.metadata
      ? ((downgradeEvent.metadata as Record<string, unknown>).pendingPlan as string | undefined)
      : undefined;

  return {
    ...subscription,
    daysUntilRenewal,
    pendingDowngrade,
  };
}

// ============================================================================
// CHECK SUBSCRIPTION EVENT IDEMPOTENCY
// ============================================================================

/**
 * Check if a subscription event with this Comgate transaction ID already exists.
 *
 * @param comgateTransactionId Comgate transaction ID
 * @returns Whether the event was already processed
 */
export async function checkSubscriptionEventIdempotency(
  comgateTransactionId: string,
): Promise<{ alreadyProcessed: boolean }> {
  const [existing] = await db
    .select({ id: subscriptionEvents.id })
    .from(subscriptionEvents)
    .where(eq(subscriptionEvents.comgateTransactionId, comgateTransactionId))
    .limit(1);

  return { alreadyProcessed: !!existing };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Activate subscription within an existing transaction.
 * Used by processSubscriptionWebhook to avoid nested transactions.
 */
async function activateSubscriptionInTx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  subscriptionId: number,
  comgateTransactionId: string,
) {
  // Lock and read subscription
  const [subscription] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .for('update')
    .limit(1);

  if (!subscription) {
    throw new NotFoundError('Subscription not found');
  }

  // Set new period
  const now = new Date();
  const periodEnd = new Date(now);
  if (subscription.billingCycle === 'annual') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setDate(periodEnd.getDate() + 30);
  }

  // Update subscription to active with recurring token
  await tx
    .update(subscriptions)
    .set({
      status: 'active',
      comgateInitTransactionId: comgateTransactionId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscriptionId));

  // Update company plan and validity
  await tx
    .update(companies)
    .set({
      subscriptionPlan: subscription.plan as SubscriptionPlan,
      subscriptionValidUntil: periodEnd,
      updatedAt: now,
    })
    .where(eq(companies.id, subscription.companyId));
}
