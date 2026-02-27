/**
 * Billing Scheduler
 *
 * BullMQ-based daily job that:
 * 1. Scans for subscriptions due for renewal and charges via Comgate recurring
 * 2. Creates SEQUENCE-based invoices with VAT and sellerSnapshot on success
 * 3. Sends invoice PDF email to company owner after successful charge
 * 4. Handles failed payments with dunning emails
 * 5. Auto-expires subscriptions after 14-day dunning grace period
 * 6. Processes pending downgrades (cancelAtPeriodEnd) at period boundary
 */

import { Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { eq, and, lte, sql } from 'drizzle-orm';
import {
  db,
  companies,
  subscriptions,
  subscriptionInvoices,
  subscriptionEvents,
} from '@schedulebox/database';
import {
  PLAN_CONFIG,
  getVatRate,
  type SubscriptionPlan,
  type BillingCycle,
} from '@schedulebox/shared';

// ============================================================================
// CONSTANTS
// ============================================================================

const BILLING_QUEUE_NAME = 'subscription-billing';
const DUNNING_GRACE_DAYS = 14;
const WEB_APP_BASE_URL = process.env.WEB_APP_URL || 'http://localhost:3000';

// Comgate recurring API configuration (inlined to avoid cross-package dependency)
const COMGATE_API_URL = process.env.COMGATE_API_URL || 'https://payments.comgate.cz';

// ============================================================================
// TYPES
// ============================================================================

interface SellerSnapshot {
  companyName: string;
  ico: string;
  dic: string;
  addressStreet: string;
  addressCity: string;
  addressZip: string;
  addressCountry: string;
}

// ============================================================================
// COMGATE RECURRING CHARGE (inlined, self-contained)
// ============================================================================

/**
 * Charge a recurring payment via Comgate.
 * Inlined to avoid cross-package coupling with the web app's Comgate client.
 */
async function chargeRecurringPayment(params: {
  initRecurringId: string;
  price: number;
  currency: string;
  label: string;
  refId: string;
  email: string;
}): Promise<{ transactionId: string; code: string; message: string }> {
  const merchantId = process.env.COMGATE_MERCHANT_ID;
  const secret = process.env.COMGATE_SECRET;

  if (!merchantId || !secret) {
    return {
      transactionId: '',
      code: 'CONFIG_ERROR',
      message: 'Comgate credentials not configured (COMGATE_MERCHANT_ID, COMGATE_SECRET)',
    };
  }

  const requestParams = new URLSearchParams();
  requestParams.set('merchant', merchantId);
  requestParams.set('secret', secret);
  requestParams.set('test', process.env.NODE_ENV !== 'production' ? 'true' : 'false');
  requestParams.set('price', Math.round(params.price * 100).toString()); // CZK -> hellers
  requestParams.set('curr', params.currency.toUpperCase());
  requestParams.set('label', params.label);
  requestParams.set('refId', params.refId);
  requestParams.set('email', params.email);
  requestParams.set('initRecurringId', params.initRecurringId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${COMGATE_API_URL}/v1.0/recurring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: requestParams.toString(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);

    return {
      transactionId: responseParams.get('transId') || '',
      code: responseParams.get('code') || '',
      message: responseParams.get('message') || '',
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      transactionId: '',
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
}

// ============================================================================
// HELPER: Get plan price based on billing cycle
// ============================================================================

function getPlanPrice(plan: SubscriptionPlan, cycle: BillingCycle): number {
  const config = PLAN_CONFIG[plan];
  return cycle === 'annual' ? config.priceAnnual : config.price;
}

// ============================================================================
// HELPER: Format date as YYYY-MM
// ============================================================================

function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ============================================================================
// HELPER: Format date as Czech locale month + year
// ============================================================================

function formatCzechPeriod(date: Date): string {
  return date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
}

// ============================================================================
// HELPER: Generate SEQUENCE-based invoice number
// ============================================================================

async function generateInvoiceNumber(tx: typeof db): Promise<string> {
  const [result] = await tx.execute(sql`SELECT nextval('subscription_invoice_seq') as num`);
  const seqNum = String(result.num).padStart(6, '0');
  const year = new Date().getFullYear();
  return `SB-${year}-${seqNum}`;
}

// ============================================================================
// PROCESS RENEWALS
// ============================================================================

async function processRenewals(emailQueue: Queue): Promise<void> {
  const now = new Date();

  // Query active subscriptions due for renewal
  const dueSubscriptions = await db
    .select({
      id: subscriptions.id,
      uuid: subscriptions.uuid,
      companyId: subscriptions.companyId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      billingCycle: subscriptions.billingCycle,
      priceAmount: subscriptions.priceAmount,
      currency: subscriptions.currency,
      comgateInitTransactionId: subscriptions.comgateInitTransactionId,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), lte(subscriptions.currentPeriodEnd, now)));

  console.log(`[Billing Scheduler] Found ${dueSubscriptions.length} subscriptions due for renewal`);

  for (const sub of dueSubscriptions) {
    try {
      // Load company data
      const [company] = await db
        .select({
          name: companies.name,
          email: companies.email,
          addressStreet: companies.addressStreet,
          addressCity: companies.addressCity,
          addressZip: companies.addressZip,
          addressCountry: companies.addressCountry,
          currency: companies.currency,
          settings: companies.settings,
        })
        .from(companies)
        .where(eq(companies.id, sub.companyId))
        .limit(1);

      if (!company) {
        console.error(
          `[Billing Scheduler] Company ${sub.companyId} not found for subscription ${sub.id}`,
        );
        continue;
      }

      const plan = sub.plan as SubscriptionPlan;
      const cycle = sub.billingCycle as BillingCycle;
      const planConfig = PLAN_CONFIG[plan];
      const planName = planConfig?.name || plan;

      // ---- Handle pending downgrade (cancelAtPeriodEnd) ----
      if (sub.cancelAtPeriodEnd) {
        console.log(
          `[Billing Scheduler] Processing pending cancellation for subscription ${sub.id}`,
        );

        // Downgrade to free: expire subscription and update company plan
        await db
          .update(subscriptions)
          .set({
            status: 'expired',
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id));

        await db
          .update(companies)
          .set({
            subscriptionPlan: 'free',
            subscriptionValidUntil: null,
            updatedAt: now,
          })
          .where(eq(companies.id, sub.companyId));

        // Log event
        await db.insert(subscriptionEvents).values({
          subscriptionId: sub.id,
          eventType: 'plan.downgraded',
          previousStatus: 'active',
          newStatus: 'expired',
          metadata: { previousPlan: plan, newPlan: 'free', reason: 'cancel_at_period_end' },
        });

        console.log(
          `[Billing Scheduler] Subscription ${sub.id} expired (pending downgrade to free)`,
        );
        continue;
      }

      // ---- Charge recurring payment ----
      if (!sub.comgateInitTransactionId) {
        console.error(
          `[Billing Scheduler] Subscription ${sub.id} has no Comgate init transaction ID, skipping`,
        );
        continue;
      }

      const planPrice = getPlanPrice(plan, cycle);
      const periodStr = formatYearMonth(now);

      const result = await chargeRecurringPayment({
        initRecurringId: sub.comgateInitTransactionId,
        price: planPrice,
        currency: sub.currency || 'CZK',
        label: `ScheduleBox ${planName} - ${periodStr}`,
        refId: `${sub.uuid}-${periodStr}`,
        email: company.email,
      });

      if (result.code === '0') {
        // ---- SUCCESS: Extend period + create invoice + send email ----
        const newPeriodStart = sub.currentPeriodEnd;
        const newPeriodEnd = new Date(newPeriodStart);
        if (cycle === 'annual') {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        } else {
          newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);
        }

        // Update subscription period
        await db
          .update(subscriptions)
          .set({
            currentPeriodStart: newPeriodStart,
            currentPeriodEnd: newPeriodEnd,
            dunningStartedAt: null,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id));

        // Update company subscription valid until
        await db
          .update(companies)
          .set({
            subscriptionValidUntil: newPeriodEnd,
            updatedAt: now,
          })
          .where(eq(companies.id, sub.companyId));

        // Log payment success event
        await db.insert(subscriptionEvents).values({
          subscriptionId: sub.id,
          eventType: 'payment.success',
          comgateTransactionId: result.transactionId,
          previousStatus: 'active',
          newStatus: 'active',
          metadata: {
            amount: planPrice,
            currency: sub.currency || 'CZK',
            newPeriodEnd: newPeriodEnd.toISOString(),
          },
        });

        // ---- Create invoice (direct DB, SEQUENCE-based) ----
        let invoice: { uuid: string; invoiceNumber: string; taxAmount: string } | null = null;
        try {
          const invoiceResult = await db.transaction(async (tx) => {
            // Get company data for buyer snapshot
            const settings = company.settings as { ico?: string; dic?: string } | null;
            const vatRate = getVatRate(company.addressCountry || 'CZ');
            const taxAmount = ((planPrice * vatRate) / 100).toFixed(2);
            const invoiceNumber = await generateInvoiceNumber(tx as unknown as typeof db);

            // Freeze company details at invoice time (Czech law compliance)
            const sellerSnapshot: SellerSnapshot = {
              companyName: company.name,
              ico: settings?.ico || '',
              dic: settings?.dic || '',
              addressStreet: company.addressStreet || '',
              addressCity: company.addressCity || '',
              addressZip: company.addressZip || '',
              addressCountry: company.addressCountry || 'CZ',
            };

            const [inv] = await tx
              .insert(subscriptionInvoices)
              .values({
                companyId: sub.companyId,
                subscriptionId: sub.id,
                invoiceNumber,
                amount: planPrice.toFixed(2),
                taxAmount,
                vatRate: vatRate.toFixed(2),
                currency: sub.currency || 'CZK',
                status: 'paid',
                period: periodStr,
                comgateTransactionId: result.transactionId,
                paidAt: now,
                sellerSnapshot,
              })
              .returning({
                uuid: subscriptionInvoices.uuid,
                invoiceNumber: subscriptionInvoices.invoiceNumber,
                taxAmount: subscriptionInvoices.taxAmount,
              });

            return inv;
          });

          invoice = invoiceResult
            ? {
                uuid: invoiceResult.uuid,
                invoiceNumber: invoiceResult.invoiceNumber,
                taxAmount: invoiceResult.taxAmount || '0',
              }
            : null;
        } catch (invoiceError) {
          console.error(
            `[Billing Scheduler] Failed to create invoice for subscription ${sub.id}:`,
            invoiceError,
          );
        }

        // ---- Send invoice email ----
        if (invoice) {
          const vatAmountNum = parseFloat(invoice.taxAmount);
          await emailQueue.add('send-email', {
            template: 'subscription-invoice',
            to: company.email,
            subject: `Faktura ${invoice.invoiceNumber} - ScheduleBox ${planName}`,
            data: {
              owner_name: company.name,
              plan_name: planName,
              invoice_number: invoice.invoiceNumber,
              amount: planPrice,
              vat_amount: vatAmountNum,
              total_amount: planPrice + vatAmountNum,
              currency: sub.currency || 'CZK',
              period: formatCzechPeriod(now),
              pdf_download_url: `${WEB_APP_BASE_URL}/api/v1/billing/invoices/${invoice.uuid}/pdf`,
              billing_portal_url: `${WEB_APP_BASE_URL}/settings/billing`,
            },
          });
        }

        console.log(
          `[Billing Scheduler] Subscription ${sub.id} renewed successfully. ` +
            `Next period: ${newPeriodEnd.toISOString()}` +
            (invoice ? `, Invoice: ${invoice.invoiceNumber}` : ''),
        );
      } else {
        // ---- FAILURE: Start dunning ----
        console.warn(
          `[Billing Scheduler] Payment failed for subscription ${sub.id}: ` +
            `code=${result.code}, message=${result.message}`,
        );

        // Transition to past_due
        await db
          .update(subscriptions)
          .set({
            status: 'past_due',
            dunningStartedAt: now,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id));

        // Log payment failure event
        await db.insert(subscriptionEvents).values({
          subscriptionId: sub.id,
          eventType: 'payment.failed',
          comgateTransactionId: result.transactionId || undefined,
          previousStatus: 'active',
          newStatus: 'past_due',
          metadata: {
            comgateCode: result.code,
            message: result.message,
            amount: planPrice,
          },
        });

        // Calculate grace end date for dunning email
        const graceEndDate = new Date(now);
        graceEndDate.setDate(graceEndDate.getDate() + DUNNING_GRACE_DAYS);

        // Enqueue dunning email
        await emailQueue.add('send-email', {
          template: 'dunning-payment-failed',
          to: company.email,
          subject: `Platba za ${planName} se nezdařila`,
          data: {
            owner_name: company.name,
            plan_name: planName,
            amount: planPrice,
            currency: sub.currency || 'CZK',
            next_retry_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(
              'cs-CZ',
            ),
            grace_end_date: graceEndDate.toLocaleDateString('cs-CZ'),
            billing_portal_url: `${WEB_APP_BASE_URL}/settings/billing`,
          },
        });

        console.log(
          `[Billing Scheduler] Subscription ${sub.id} transitioned to past_due, dunning email sent`,
        );
      }
    } catch (error) {
      console.error(`[Billing Scheduler] Error processing subscription ${sub.id}:`, error);
    }
  }
}

// ============================================================================
// PROCESS DUNNING
// ============================================================================

async function processDunning(emailQueue: Queue): Promise<void> {
  const now = new Date();

  // Query past_due subscriptions
  const pastDueSubscriptions = await db
    .select({
      id: subscriptions.id,
      uuid: subscriptions.uuid,
      companyId: subscriptions.companyId,
      plan: subscriptions.plan,
      dunningStartedAt: subscriptions.dunningStartedAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'past_due'));

  console.log(`[Billing Scheduler] Found ${pastDueSubscriptions.length} past_due subscriptions`);

  for (const sub of pastDueSubscriptions) {
    try {
      if (!sub.dunningStartedAt) {
        console.warn(
          `[Billing Scheduler] Subscription ${sub.id} is past_due but has no dunningStartedAt`,
        );
        continue;
      }

      const daysSinceDunning = Math.floor(
        (now.getTime() - sub.dunningStartedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      const plan = sub.plan as SubscriptionPlan;
      const planName = PLAN_CONFIG[plan]?.name || plan;

      // Load company data
      const [company] = await db
        .select({
          name: companies.name,
          email: companies.email,
        })
        .from(companies)
        .where(eq(companies.id, sub.companyId))
        .limit(1);

      if (!company) {
        continue;
      }

      if (daysSinceDunning >= DUNNING_GRACE_DAYS) {
        // ---- EXPIRE: Grace period exceeded ----
        await db
          .update(subscriptions)
          .set({
            status: 'expired',
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id));

        await db
          .update(companies)
          .set({
            subscriptionPlan: 'free',
            subscriptionValidUntil: null,
            updatedAt: now,
          })
          .where(eq(companies.id, sub.companyId));

        // Log expiration event
        await db.insert(subscriptionEvents).values({
          subscriptionId: sub.id,
          eventType: 'subscription.expired',
          previousStatus: 'past_due',
          newStatus: 'expired',
          metadata: {
            reason: 'dunning_grace_period_exceeded',
            daysPastDue: daysSinceDunning,
          },
        });

        // Send final expiration email
        await emailQueue.add('send-email', {
          template: 'dunning-final-warning',
          to: company.email,
          subject: 'Vaše předplatné bylo zrušeno',
          data: {
            owner_name: company.name,
            plan_name: planName,
            expiration_date: now.toLocaleDateString('cs-CZ'),
            billing_portal_url: `${WEB_APP_BASE_URL}/settings/billing`,
          },
        });

        console.log(
          `[Billing Scheduler] Subscription ${sub.id} expired after ${daysSinceDunning} days of non-payment`,
        );
      } else if (daysSinceDunning >= 7) {
        // ---- 7-DAY WARNING: Check if already sent ----
        const existingWarning = await db
          .select({ id: subscriptionEvents.id })
          .from(subscriptionEvents)
          .where(
            and(
              eq(subscriptionEvents.subscriptionId, sub.id),
              eq(subscriptionEvents.eventType, 'dunning.warning_7d'),
            ),
          )
          .limit(1);

        if (existingWarning.length === 0) {
          // Calculate expiration date
          const expirationDate = new Date(sub.dunningStartedAt);
          expirationDate.setDate(expirationDate.getDate() + DUNNING_GRACE_DAYS);

          // Send 7-day warning email
          await emailQueue.add('send-email', {
            template: 'dunning-final-warning',
            to: company.email,
            subject: `Posledni upozorneni: Vas ucet bude preveden na Free`,
            data: {
              owner_name: company.name,
              plan_name: planName,
              expiration_date: expirationDate.toLocaleDateString('cs-CZ'),
              billing_portal_url: `${WEB_APP_BASE_URL}/settings/billing`,
            },
          });

          // Log warning event (idempotency marker)
          await db.insert(subscriptionEvents).values({
            subscriptionId: sub.id,
            eventType: 'dunning.warning_7d',
            previousStatus: 'past_due',
            newStatus: 'past_due',
            metadata: { daysPastDue: daysSinceDunning },
          });

          console.log(`[Billing Scheduler] Sent 7-day dunning warning for subscription ${sub.id}`);
        }
      }
    } catch (error) {
      console.error(
        `[Billing Scheduler] Error processing dunning for subscription ${sub.id}:`,
        error,
      );
    }
  }
}

// ============================================================================
// START BILLING SCHEDULER
// ============================================================================

/**
 * Start the billing scheduler.
 *
 * Creates a BullMQ queue with a daily job scheduler (06:00 UTC) that:
 * - Processes renewals (charge + invoice + email)
 * - Processes dunning (7-day warning + 14-day expiry)
 *
 * Uses upsertJobScheduler (BullMQ 5.16+) instead of deprecated Queue.add with repeat.
 *
 * @param emailQueue The shared email queue for enqueuing notification emails
 * @param redisConnection Redis connection options for BullMQ
 * @returns Queue and Worker for graceful shutdown
 */
export async function startBillingScheduler(
  emailQueue: Queue,
  redisConnection: ConnectionOptions,
): Promise<{ queue: Queue; worker: Worker }> {
  // Create billing queue
  const billingQueue = new Queue(BILLING_QUEUE_NAME, {
    connection: redisConnection,
  });

  // Schedule daily renewal scan at 06:00 UTC using upsertJobScheduler (BullMQ 5.16+)
  await billingQueue.upsertJobScheduler(
    'daily-renewal-scanner',
    { pattern: '0 6 * * *' },
    {
      name: 'scan-renewals',
      data: {},
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnFail: 100,
      },
    },
  );

  console.log('[Billing Scheduler] Daily renewal job scheduled (06:00 UTC)');

  // Create worker with concurrency 1 (single scanner at a time)
  const worker = new Worker(
    BILLING_QUEUE_NAME,
    async () => {
      console.log('[Billing Scheduler] Starting daily billing scan...');
      const startTime = Date.now();

      await processRenewals(emailQueue);
      await processDunning(emailQueue);

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Billing Scheduler] Daily billing scan completed in ${durationSec}s`);
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[Billing Scheduler] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Billing Scheduler] Job ${job?.id} failed:`, error);
  });

  console.log('[Billing Scheduler] Worker started');

  return { queue: billingQueue, worker };
}
