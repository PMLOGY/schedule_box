# Phase 28: Subscription Billing Infrastructure - Research

**Researched:** 2026-02-24
**Domain:** SaaS subscription billing via Comgate recurring payments, subscription state machine, invoice PDF generation, BullMQ scheduled renewal jobs
**Confidence:** HIGH (codebase-verified for architecture, existing patterns, and stack); MEDIUM for Comgate recurring REST API parameter names (official docs 403, inferred from PHP SDK + community libraries)

## Summary

Phase 28 adds subscription billing to ScheduleBox so companies can pay for plan tiers (Free/Essential/Growth/AI-Powered) via Comgate recurring payments. The implementation extends the existing Comgate client with two new functions (`initRecurring=true` on first payment, `POST /v1.0/recurring` for subsequent charges), adds a `subscriptions` table and `subscription_invoices` table (separate from the existing `payments`/`invoices` tables which are FK-constrained to bookings), implements a subscription state machine (trialing/active/past_due/cancelled/expired), adds a BullMQ recurring billing job to the existing notification worker, builds a billing portal UI page, and generates Czech-compliant invoice PDFs using the existing PDFKit infrastructure.

Zero new npm packages are required. The existing stack covers everything: Comgate client (extend with 2 functions), BullMQ 5.29.5 (add `upsertJobScheduler` for renewal cron), PDFKit 0.17.2 (already used for booking invoices, extend for subscription invoices), Handlebars (email templates for dunning), and the existing webhook idempotency pattern in `processedWebhooks` table. The `@react-pdf/renderer` is already in `serverExternalPackages` in `next.config.mjs`. The existing `generateInvoicePDF` function in `apps/web/app/api/v1/invoices/generate.ts` provides the exact pattern to follow for subscription invoices.

The two highest-risk items are: (1) the CHECK constraint on `companies.subscription_plan` currently allows only `'free', 'starter', 'professional', 'enterprise'` but v1.3 plan names are `'free', 'essential', 'growth', 'ai_powered'` -- this must be resolved in the migration, and (2) Comgate recurring must be manually activated on merchant 498621 before any billing code can be tested.

**Primary recommendation:** Build the `subscriptions` table + Comgate recurring client extension first, then the webhook handler + BullMQ renewal job, then the billing portal UI, and finally the invoice PDF generation. Each step is independently testable.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Comgate REST API | v1.0 | Payment gateway (recurring) | Already integrated for one-time payments; Czech/SK market gateway |
| BullMQ | ^5.29.5 | Scheduled renewal jobs + dunning | Already deployed in notification-worker; `upsertJobScheduler` API |
| PDFKit | ^0.17.2 | Invoice PDF generation | Already used for booking invoices in `apps/web/app/api/v1/invoices/generate.ts` |
| Drizzle ORM | ^0.36.4 | Database schema + queries | Project ORM; migration via `drizzle-kit generate` |
| Handlebars | ^4.7.8 | Dunning email templates | Already used in notification-worker template renderer |
| ioredis | ^5.9.2 | Subscription status caching | Already used across the project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | ^3.23.0 | Input validation for billing endpoints | Every API endpoint body/params |
| date-fns | ^4.1.0 | Period calculations, proration math | Billing cycle date arithmetic |
| nodemailer | ^7.0.11 | Dunning email delivery | Via existing notification-worker email sender |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PDFKit (server) | @react-pdf/renderer (React) | PDFKit already proven for invoices in codebase; @react-pdf adds complexity for simple invoices |
| BullMQ cron | pg_cron | Railway lacks superuser for CREATE EXTENSION; BullMQ already deployed |
| Custom Comgate client | Stripe/Paddle SDK | Comgate already approved for CZ/SK; switching gateway requires regulatory re-approval |

**Installation:**
```bash
# No new packages needed. All dependencies already installed.
```

## Architecture Patterns

### Recommended File Structure

```
packages/database/src/schema/
  subscriptions.ts                    # NEW: subscriptions + subscription_invoices + subscription_events tables

apps/web/app/api/v1/billing/
  plans/route.ts                      # GET available plans with pricing
  subscribe/route.ts                  # POST initiate subscription (first Comgate payment)
  subscription/route.ts               # GET current subscription, PUT cancel/change
  upgrade/route.ts                    # POST upgrade plan (prorated)
  downgrade/route.ts                  # POST downgrade plan (end of period)
  invoices/route.ts                   # GET subscription invoice list
  invoices/[id]/pdf/route.ts          # GET download subscription invoice PDF
  status/route.ts                     # GET polling endpoint for post-payment UI sync
  webhook/route.ts                    # POST Comgate recurring webhook handler

apps/web/app/api/v1/payments/comgate/
  client.ts                           # EXTEND with initRecurring + chargeRecurring

apps/web/app/[locale]/(dashboard)/settings/billing/
  page.tsx                            # Billing portal UI

services/notification-worker/src/
  schedulers/billing-scheduler.ts     # NEW: BullMQ renewal job scheduler
  templates/email/dunning-*.hbs       # NEW: dunning email templates
```

### Pattern 1: Comgate Recurring Two-Phase Flow

**What:** Comgate recurring payments work in two phases: initial payment with `initRecurring=true` creates a card token reference, subsequent charges use `POST /v1.0/recurring` with `initRecurringId` from the first payment.

**When to use:** Every subscription payment flow.

**Implementation (extending existing client):**
```typescript
// Source: Comgate PHP SDK (github.com/comgate-payments/sdk-php) + contributte/comgate
// + REST API search results confirming endpoint and parameters

// Phase 1: Initial subscription payment (user-facing redirect)
// Add initRecurring parameter to existing initComgatePayment:
export async function initComgatePayment(params: InitComgatePaymentParams): Promise<ComgatePaymentResponse> {
  // ... existing code ...
  if (params.initRecurring) {
    requestParams.set('initRecurring', 'true');
  }
  // ... rest unchanged ...
}

// Phase 2: Subsequent recurring charge (server-to-server, no redirect)
export async function chargeRecurringPayment(params: {
  initRecurringId: string; // transId from initial payment
  price: number;           // in CZK
  currency: string;
  label: string;
  refId: string;
  email: string;
}): Promise<{ transactionId: string; code: string; message: string }> {
  const { merchantId, secret } = getComgateCredentials();
  const requestParams = new URLSearchParams();
  requestParams.set('merchant', merchantId);
  requestParams.set('secret', secret);
  requestParams.set('test', process.env.NODE_ENV !== 'production' ? 'true' : 'false');
  requestParams.set('price', Math.round(params.price * 100).toString()); // hellers
  requestParams.set('curr', params.currency.toUpperCase());
  requestParams.set('label', params.label);
  requestParams.set('refId', params.refId);
  requestParams.set('email', params.email);
  requestParams.set('initRecurringId', params.initRecurringId);

  const response = await fetchWithTimeout(`${COMGATE_API_URL}/v1.0/recurring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: requestParams.toString(),
  });

  const responseText = await response.text();
  const responseParams = new URLSearchParams(responseText);
  const code = responseParams.get('code') || '';
  const message = responseParams.get('message') || '';
  const transactionId = responseParams.get('transId') || '';

  return { transactionId, code, message };
  // code === '0' means success (payment created and charged)
}
```

### Pattern 2: Subscription State Machine

**What:** Finite state machine governing subscription lifecycle with explicit transitions.

**When to use:** Every subscription status change.

**States and transitions:**
```
trialing   -> active       (trial ends + payment succeeds)
trialing   -> expired      (trial ends + no payment method)
active     -> active       (renewal succeeds, new period)
active     -> past_due     (renewal fails)
active     -> cancelled    (user cancels, takes effect at period end)
past_due   -> active       (retry payment succeeds)
past_due   -> expired      (14 days without successful payment)
cancelled  -> expired      (period end reached)
```

**Implementation:**
```typescript
const VALID_SUBSCRIPTION_TRANSITIONS: Record<string, string[]> = {
  trialing:  ['active', 'expired'],
  active:    ['active', 'past_due', 'cancelled'],
  past_due:  ['active', 'expired'],
  cancelled: ['expired'],
  expired:   [], // terminal state
};
```

### Pattern 3: BullMQ Job Scheduler for Renewals

**What:** Use `upsertJobScheduler` (BullMQ 5.16+) to schedule daily renewal scanning.

**When to use:** Checking which subscriptions need renewal charges.

**Example:**
```typescript
// Source: https://docs.bullmq.io/guide/job-schedulers
import { Queue, Worker } from 'bullmq';

const BILLING_QUEUE = 'subscription-billing';

// Schedule daily check at 06:00 UTC (07:00 or 08:00 CET/CEST)
await billingQueue.upsertJobScheduler(
  'daily-renewal-scanner',
  { pattern: '0 0 6 * * *' }, // cron: 06:00 UTC daily
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

// Worker processes the scan
const billingWorker = new Worker(BILLING_QUEUE, async (job) => {
  // Query subscriptions where currentPeriodEnd <= now AND status = 'active'
  // For each: call chargeRecurringPayment() -> update subscription
}, { connection: redisConnection, concurrency: 1 });
```

### Pattern 4: Subscription Invoice Numbering with PostgreSQL SEQUENCE

**What:** Use a PostgreSQL SEQUENCE instead of `MAX(invoice_number) + 1` to prevent race conditions under concurrent renewals.

**When to use:** All subscription invoice creation.

**Example (migration SQL):**
```sql
-- Create a shared sequence for subscription invoice numbering
CREATE SEQUENCE IF NOT EXISTS subscription_invoice_seq START 1;

-- In the invoice creation code:
-- SELECT nextval('subscription_invoice_seq') to get the next number
-- Format: SB-YYYY-NNNNNN (e.g., SB-2026-000001)
```

### Pattern 5: Webhook Idempotency for Subscription Events

**What:** Dedicated `subscription_events` table for logging every subscription state change, with idempotent webhook processing.

**When to use:** Every Comgate webhook related to subscription payments.

**Example:**
```typescript
// Follows existing pattern from payments/service.ts checkWebhookIdempotency()
// But uses subscription_events table instead of processed_webhooks
// Also uses SELECT FOR UPDATE on subscriptions row to prevent concurrent updates
await db.transaction(async (tx) => {
  // 1. Lock subscription row
  const [sub] = await tx.select().from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .for('update');

  // 2. Check idempotency (insert-or-ignore on subscription_events)
  // 3. Update subscription status
  // 4. Update companies.subscriptionPlan + subscriptionValidUntil
});
```

### Anti-Patterns to Avoid

- **Mixing subscription payments into the `payments` table:** The existing `payments.bookingId` is NOT NULL. Subscription charges have no booking. Use separate `subscription_invoices` table.
- **Using `MAX(invoice_number) + 1` for subscription invoices:** Race condition under concurrent renewals. Use PostgreSQL SEQUENCE.
- **Updating `companies.subscription_plan` without SELECT FOR UPDATE:** Webhook and sync-on-return endpoint can race. Always lock the row first.
- **Hardcoding 21% VAT rate:** Slovak companies pay 20%. VAT rate must be derived from `companies.addressCountry`.
- **Relying on Comgate to initiate recurring charges:** Comgate does NOT auto-charge. Your server must call `/v1.0/recurring` for each billing cycle.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invoice numbering | MAX+1 pattern | PostgreSQL SEQUENCE | Race condition under concurrent renewals; 23505 unique violation |
| PDF generation | Custom PDF library | PDFKit (already installed) | Existing `generateInvoicePDF` function to extend |
| Recurring job scheduling | Custom cron / setInterval | BullMQ `upsertJobScheduler` | Already deployed, persistence, retry, monitoring |
| Email template rendering | String concatenation | Handlebars (already installed) | Existing template renderer in notification-worker |
| Webhook idempotency | Custom deduplication | INSERT + 23505 catch pattern | Existing `checkWebhookIdempotency` pattern in payments/service.ts |
| Payment gateway | Stripe/Paddle SDK | Existing Comgate client extension | Already approved for CZ/SK market; regulatory compliance |

**Key insight:** Every building block for subscription billing already exists in the codebase. This phase is about extending existing patterns (Comgate client, webhook handler, BullMQ scheduler, PDFKit invoices, Handlebars emails), not building from scratch.

## Common Pitfalls

### Pitfall 1: CHECK Constraint on companies.subscription_plan Blocks New Plan Names

**What goes wrong:** The `companies` table has a CHECK constraint allowing only `'free', 'starter', 'professional', 'enterprise'`. The v1.3 plan names are `'free', 'essential', 'growth', 'ai_powered'`. Any INSERT or UPDATE with the new names will fail with a CHECK violation.

**Why it happens:** The schema was defined in v1.0 with placeholder plan names. The CHECK constraint lives in both the Drizzle schema (`auth.ts` line 73) and the live database.

**How to avoid:** The first migration in Phase 28 must: (1) DROP the old CHECK constraint, (2) UPDATE any existing rows with old names to new names (`starter -> essential`, `professional -> growth`, `enterprise -> ai_powered`), (3) ADD new CHECK constraint with `'free', 'essential', 'growth', 'ai_powered'`. Update the `$type<>` annotation in `auth.ts` simultaneously.

**Warning signs:** Any `INSERT INTO companies` or `UPDATE companies SET subscription_plan = 'essential'` throws `23514` CHECK violation.

### Pitfall 2: Comgate Recurring Requires Manual Merchant Activation

**What goes wrong:** Recurring payments are a separate Comgate service that must be explicitly enabled on merchant account 498621 by contacting Comgate support. Without activation, `initRecurring=true` may be silently ignored or return an error.

**Why it happens:** Recurring card payments involve stored card tokens and PCI DSS compliance requirements; Comgate does not auto-enable this for all merchants.

**How to avoid:** Contact Comgate support BEFORE writing any recurring billing code. Get written confirmation that recurring is active on merchant 498621. Verify in sandbox if possible (sandbox may not support recurring -- ask Comgate).

**Warning signs:** First payment succeeds but `chargeRecurringPayment` returns error code != 0.

### Pitfall 3: Webhook Race Condition on Subscription Activation

**What goes wrong:** User pays via Comgate, returns to dashboard, but webhook hasn't arrived yet. Dashboard shows "Free plan" for 1-5 seconds. If a sync-on-return check and the webhook both try to update `subscription_plan` simultaneously, race condition occurs.

**Why it happens:** Comgate webhooks arrive 1-5 seconds after user redirect. The existing webhook handler (`apps/web/app/api/v1/webhooks/comgate/route.ts`) already demonstrates this latency pattern.

**How to avoid:** (1) `subscription_events` idempotency table records every state change, (2) `SELECT FOR UPDATE` on subscriptions row in the webhook handler, (3) Frontend polls `GET /api/v1/billing/status` every 1s for up to 10s after payment return, (4) The status endpoint reads from `subscription_events` to detect if webhook has arrived.

**Warning signs:** User reports "I paid but still see Free plan"; load test shows inconsistent subscription states.

### Pitfall 4: Invoice Numbering Race Under Concurrent Renewals

**What goes wrong:** Multiple subscriptions renew simultaneously (e.g., 50 companies all billing on the 1st of the month). The existing `generateInvoiceNumber()` in `payments/service.ts` uses `MAX(invoice_number) + 1` inside a transaction -- but two transactions reading MAX at the same time get the same value. One succeeds, the other throws 23505.

**Why it happens:** The `invoices` table has `UNIQUE(company_id, invoice_number)`. For subscription invoices this pattern will be hit because the BullMQ worker processes multiple renewals concurrently.

**How to avoid:** Use a PostgreSQL SEQUENCE for subscription invoice numbering. Format: `SB-{YYYY}-{nextval}`. The sequence is globally unique so no per-company race conditions.

**Warning signs:** `23505` unique constraint violations in subscription invoice creation logs; invoices silently not created for some renewal cycles.

### Pitfall 5: Existing Invoice Table Has NOT NULL FK to payments.id

**What goes wrong:** Attempting to store subscription invoices in the existing `invoices` table fails because `invoices.paymentId` has a NOT NULL constraint referencing `payments.id`, and `payments.bookingId` is NOT NULL referencing `bookings.id`. Subscription charges have no associated booking.

**Why it happens:** The existing invoice system was designed for booking-level transactions only.

**How to avoid:** Create a separate `subscription_invoices` table. Do not attempt to reuse the existing `invoices` table for subscription billing.

**Warning signs:** Foreign key constraint violation on INSERT into invoices without a bookingId.

### Pitfall 6: Dunning Grace Period Must Soft-Disable, Never Delete

**What goes wrong:** When a subscription expires after the 14-day dunning period, a naive implementation might delete the company's data or immediately revoke all access.

**Why it happens:** Temptation to "clean up" expired subscriptions aggressively.

**How to avoid:** Downgrade to Free plan (`companies.subscription_plan = 'free'`). Soft-disable paid features. Never delete company data, bookings, customers, or settings. The owner must be able to re-subscribe and recover their full account.

**Warning signs:** Data loss complaints from churned-and-resubscribed customers.

## Code Examples

### Subscription Table Schema (Drizzle)

```typescript
// Source: codebase analysis + .planning/research/ARCHITECTURE.md
// packages/database/src/schema/subscriptions.ts

import { pgTable, serial, uuid, varchar, integer, numeric, timestamp,
         boolean, text, jsonb, index, check, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { companies } from './auth';

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  companyId: integer('company_id').notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  plan: varchar('plan', { length: 20 }).notNull()
    .$type<'free' | 'essential' | 'growth' | 'ai_powered'>(),
  status: varchar('status', { length: 20 }).notNull().default('trialing')
    .$type<'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'>(),
  billingCycle: varchar('billing_cycle', { length: 10 }).notNull().default('monthly')
    .$type<'monthly' | 'annual'>(),
  priceAmount: numeric('price_amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('CZK'),
  comgateInitTransactionId: varchar('comgate_init_transaction_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),
  dunningStartedAt: timestamp('dunning_started_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusCheck: check('subscriptions_status_check',
    sql`${table.status} IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')`),
  planCheck: check('subscriptions_plan_check',
    sql`${table.plan} IN ('free', 'essential', 'growth', 'ai_powered')`),
  companyIdx: index('idx_subscriptions_company').on(table.companyId),
  statusIdx: index('idx_subscriptions_status').on(table.status),
  periodEndIdx: index('idx_subscriptions_period_end').on(table.currentPeriodEnd),
}));

export const subscriptionInvoices = pgTable('subscription_invoices', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  companyId: integer('company_id').notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  subscriptionId: integer('subscription_id').notNull()
    .references(() => subscriptions.id, { onDelete: 'restrict' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0'),
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('21.00'),
  currency: varchar('currency', { length: 3 }).default('CZK'),
  status: varchar('status', { length: 20 }).default('draft')
    .$type<'draft' | 'issued' | 'paid' | 'failed'>(),
  period: varchar('period', { length: 20 }).notNull(), // e.g., '2026-03'
  comgateTransactionId: varchar('comgate_transaction_id', { length: 255 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  pdfUrl: varchar('pdf_url', { length: 500 }),
  // Company billing snapshot at time of invoice (Czech law: invoice must reflect
  // the seller's details at time of issue, not current details)
  sellerSnapshot: jsonb('seller_snapshot'), // { name, ico, dic, address, ... }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusCheck: check('sub_invoices_status_check',
    sql`${table.status} IN ('draft', 'issued', 'paid', 'failed')`),
  companyIdx: index('idx_sub_invoices_company').on(table.companyId),
  subscriptionIdx: index('idx_sub_invoices_subscription').on(table.subscriptionId),
  invoiceNumberUnique: unique('sub_invoices_number_unique').on(table.invoiceNumber),
}));

export const subscriptionEvents = pgTable('subscription_events', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  // e.g., 'payment.success', 'payment.failed', 'plan.upgraded', 'plan.downgraded',
  //       'subscription.cancelled', 'subscription.expired', 'dunning.started'
  comgateTransactionId: varchar('comgate_transaction_id', { length: 255 }),
  previousStatus: varchar('previous_status', { length: 20 }),
  newStatus: varchar('new_status', { length: 20 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  subscriptionIdx: index('idx_sub_events_subscription').on(table.subscriptionId),
  eventTypeIdx: index('idx_sub_events_type').on(table.eventType),
  comgateIdx: index('idx_sub_events_comgate_tx').on(table.comgateTransactionId),
}));
```

### Comgate Recurring Flow (Full Lifecycle)

```typescript
// Step 1: Owner clicks "Subscribe to Essential Plan"
// POST /api/v1/billing/subscribe { plan: 'essential' }

// In the handler:
const { transactionId, redirectUrl } = await initComgatePayment({
  price: 490, // CZK
  currency: 'CZK',
  label: 'ScheduleBox Essential - first month',
  refId: subscription.uuid,
  email: ownerEmail,
  redirectUrl: `${baseUrl}/api/v1/billing/callback`,
  callbackUrl: `${baseUrl}/api/v1/billing/webhook`,
  initRecurring: true, // NEW parameter
});

// Store subscription with comgateInitTransactionId = transactionId
// Redirect owner to Comgate payment page

// Step 2: Comgate webhook arrives (payment success)
// POST /api/v1/billing/webhook
// Parse body, verify secret, check idempotency
// Update subscription status: trialing -> active
// Update companies.subscriptionPlan = 'essential'

// Step 3: Monthly renewal (BullMQ job)
const result = await chargeRecurringPayment({
  initRecurringId: subscription.comgateInitTransactionId,
  price: 490,
  currency: 'CZK',
  label: `ScheduleBox Essential - ${format(new Date(), 'yyyy-MM')}`,
  refId: `${subscription.uuid}-${format(new Date(), 'yyyy-MM')}`,
  email: ownerEmail,
});

if (result.code === '0') {
  // Success: extend period, create invoice
} else {
  // Failure: transition to past_due, start dunning
}
```

### Proration Calculation

```typescript
// Upgrade from Essential (490 CZK) to Growth (1490 CZK) mid-period
function calculateProration(
  currentPlanPrice: number,
  newPlanPrice: number,
  currentPeriodEnd: Date,
): number {
  const now = new Date();
  const totalDaysInPeriod = 30; // or calculate from period start/end
  const remainingDays = Math.max(0,
    Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  const dailyDifference = (newPlanPrice - currentPlanPrice) / totalDaysInPeriod;
  return Math.max(0, Math.round(dailyDifference * remainingDays * 100) / 100);
}
```

### Dunning Email Template (Handlebars)

```handlebars
{{!-- services/notification-worker/src/templates/email/dunning-payment-failed.hbs --}}
<h2>Platba za {{plan_name}} se nezdařila</h2>
<p>Vážený/á {{owner_name}},</p>
<p>vaše měsíční platba za plán {{plan_name}} ve výši {{formatCurrency amount currency}}
   se nepodařila zpracovat.</p>
<p>Další pokus o platbu proběhne {{formatDate next_retry_date}}.</p>
<p>Pokud nebude platba úspěšná do {{formatDate grace_end_date}},
   váš účet bude automaticky převeden na bezplatný plán Free.</p>
<p><a href="{{billing_portal_url}}">Aktualizovat platební údaje</a></p>
```

### Czech VAT Rate per Country

```typescript
// VAT rate must be configurable per company country
function getVatRate(country: string): number {
  switch (country) {
    case 'CZ': return 21;
    case 'SK': return 20;
    default: return 21; // Default to CZ rate
  }
}

// Usage in subscription invoice creation:
const vatRate = getVatRate(company.addressCountry || 'CZ');
const taxAmount = (amount * vatRate / 100).toFixed(2);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|-------------|-----------------|--------------|--------|
| BullMQ repeatable jobs | BullMQ `upsertJobScheduler` | BullMQ 5.16.0 (2024) | Old `add(..., { repeat: {} })` deprecated; use `upsertJobScheduler` |
| `MAX(invoice_number) + 1` | PostgreSQL SEQUENCE | Known pattern | Prevents race condition in concurrent billing |
| Hardcoded 21% VAT | Country-based VAT rate | CZ/SK market requirement | Slovak companies pay 20% |

**Deprecated/outdated:**
- BullMQ `Queue.add()` with `repeat` option: Deprecated in favor of `upsertJobScheduler` since v5.16.0. The existing notification-worker uses the old pattern for reminders but new code should use the new API.

## Open Questions

1. **Comgate Recurring REST Parameter Names**
   - What we know: PHP SDK uses `setInitRecurring(true)` and `setInitRecurringId()`. REST endpoint is `POST /v1.0/recurring`. Parameters are `application/x-www-form-urlencoded`. Search results confirm curl example: `--data "&merchant=...&test=...&price=...&curr=...&refId=...&secret=...&initRecurringId=..."`. Response `code=0` means success.
   - What's unclear: Exact list of ALL optional parameters for the `/v1.0/recurring` endpoint. Whether `email` is required or optional on subsequent charges.
   - Recommendation: Test in Comgate sandbox before building the renewal job. The core parameters (merchant, secret, test, price, curr, refId, initRecurringId) are confirmed from multiple sources. Add `email` defensively.

2. **Plan Name Canonicalization**
   - What we know: DB CHECK constraint allows `free/starter/professional/enterprise`. v1.3 docs say `free/essential/growth/ai_powered`. Both cannot coexist.
   - What's unclear: Whether business has confirmed the new names.
   - Recommendation: The migration MUST update the CHECK constraint. Assume `essential/growth/ai_powered` per product documentation. Migration: `ALTER TABLE companies DROP CONSTRAINT subscription_plan_check; UPDATE companies SET subscription_plan = 'essential' WHERE subscription_plan = 'starter'; UPDATE companies SET subscription_plan = 'growth' WHERE subscription_plan = 'professional'; UPDATE companies SET subscription_plan = 'ai_powered' WHERE subscription_plan = 'enterprise'; ALTER TABLE companies ADD CONSTRAINT subscription_plan_check CHECK (subscription_plan IN ('free', 'essential', 'growth', 'ai_powered'));`

3. **Comgate Sandbox Recurring Support**
   - What we know: Comgate has a sandbox (`test=true` parameter). Standard payments work in sandbox.
   - What's unclear: Whether recurring payments can be tested in sandbox or require production testing with real card.
   - Recommendation: Ask Comgate support when requesting recurring activation. Plan for production testing if sandbox does not support it.

4. **Annual Billing Option**
   - What we know: Research mentions "2 months free" for annual billing as a should-have feature.
   - What's unclear: Whether annual billing is in scope for Phase 28 or deferred.
   - Recommendation: Include `billingCycle: 'monthly' | 'annual'` in the schema from day 1. Implementation of annual billing can be deferred but the data model should support it.

## Sources

### Primary (HIGH confidence)
- ScheduleBox codebase: `packages/database/src/schema/auth.ts` -- companies table with subscription_plan CHECK constraint (direct inspection 2026-02-24)
- ScheduleBox codebase: `packages/database/src/schema/payments.ts` -- payments table with NOT NULL bookingId FK (direct inspection 2026-02-24)
- ScheduleBox codebase: `apps/web/app/api/v1/payments/comgate/client.ts` -- existing Comgate HTTP client (direct inspection 2026-02-24)
- ScheduleBox codebase: `apps/web/app/api/v1/webhooks/comgate/route.ts` -- existing webhook handler with idempotency (direct inspection 2026-02-24)
- ScheduleBox codebase: `apps/web/app/api/v1/payments/service.ts` -- existing invoice numbering and webhook idempotency patterns (direct inspection 2026-02-24)
- ScheduleBox codebase: `apps/web/app/api/v1/invoices/generate.ts` -- existing PDFKit invoice generation (direct inspection 2026-02-24)
- ScheduleBox codebase: `services/notification-worker/src/index.ts` -- BullMQ worker architecture (direct inspection 2026-02-24)
- ScheduleBox codebase: `services/notification-worker/src/schedulers/reminder-scheduler.ts` -- existing BullMQ scheduler pattern (direct inspection 2026-02-24)
- ScheduleBox codebase: `apps/web/next.config.mjs` -- `serverExternalPackages` includes `@react-pdf/renderer` and `pdfkit` (direct inspection 2026-02-24)
- BullMQ Job Schedulers: https://docs.bullmq.io/guide/job-schedulers -- `upsertJobScheduler` API confirmed
- `.planning/research/SUMMARY.md` -- milestone-level research findings (2026-02-24)
- `.planning/research/ARCHITECTURE.md` -- subscription schema design and integration analysis (2026-02-24)
- `.planning/research/PITFALLS.md` -- billing-specific pitfalls (2026-02-24)

### Secondary (MEDIUM confidence)
- Comgate PHP SDK: https://github.com/comgate-payments/sdk-php -- `setInitRecurring(true)`, `initRecurringPayment()` methods confirmed
- Contributte Comgate library: https://github.com/contributte/comgate/commit/d345063 -- `initRecurring` property, separate endpoint for recurring payments
- Comgate REST API search results: confirmed `POST /v1.0/recurring` endpoint with `initRecurringId` parameter and `application/x-www-form-urlencoded` format
- Comgate recurring payments help: https://help.comgate.cz/docs/en/recurring-payments (403 during direct fetch, confirmed via search snippets)
- Comgate API docs: https://apidoc.comgate.cz/en/api/rest/ (403 during direct fetch)
- Ondrs Comgate library: https://github.com/ondrs/comgate -- confirms separate URL for recurring payments (`$paymentsUrl2`), `initRecurring` and `initRecurringId` parameters

### Tertiary (LOW confidence)
- Comgate sandbox recurring support: Unknown -- needs direct verification with Comgate support
- Exact optional parameter list for `/v1.0/recurring`: Not fully documented in accessible sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new packages; all extensions of existing verified dependencies
- Architecture: HIGH -- subscription table design, webhook idempotency, BullMQ scheduler all verified against existing codebase patterns
- Comgate recurring API: MEDIUM -- parameter names confirmed from PHP SDK + 3 community libraries + search results, but official REST docs returned 403; endpoint URL and core parameters are consistent across all sources
- Invoice PDF: HIGH -- existing `generateInvoicePDF` function provides exact pattern to follow
- Pitfalls: HIGH -- based on direct codebase inspection (CHECK constraint, payments.bookingId NOT NULL, generateInvoiceNumber race condition)

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days -- stable stack, known patterns)
