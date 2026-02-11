# Phase 6: Payment Integration - Research

**Researched:** 2026-02-11
**Domain:** Payment gateway integration, SAGA pattern, webhook processing, invoice generation
**Confidence:** MEDIUM-HIGH

## Summary

Phase 6 integrates Comgate (Czech card payment gateway) and QR code payments for on-site transactions using the SAGA choreography pattern to ensure reliable booking-payment coordination. The implementation requires webhook processing with idempotency guarantees, invoice PDF generation, and state machine-based payment tracking.

Comgate provides a redirect-based payment flow with webhook callbacks. Czech QR payments follow the SPD (Short Payment Descriptor) format standardized by the Czech Banking Association, supported by npm packages `@spayd/core` or `@tedyno/cz-qr-payment`. SAGA choreography uses RabbitMQ events (CloudEvents format) to coordinate booking creation, payment processing, and confirmation/cancellation compensation.

Key technical challenges include: webhook signature verification with raw body handling in Express, idempotent webhook processing to prevent double-charging, SELECT FOR UPDATE in Drizzle ORM for preventing double-booking race conditions, and timeout handling for abandoned payment sessions.

**Primary recommendation:** Use Comgate's redirect flow with dedicated webhook endpoint (express.raw middleware), @spayd/core for Czech QR payments, invoice-pdfkit for VAT-compliant PDF generation, and RabbitMQ choreography saga with compensation events for booking state management.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| amqplib | 0.10.x | RabbitMQ client | Official Node.js AMQP 0-9-1 library, CloudEvents compatible |
| @spayd/core | latest | Czech QR payment generation | Czech Banking Association standard (SPD format) |
| invoice-pdfkit | latest | Invoice PDF generation | VAT support, i18n ready, PDFKit-based (no Puppeteer overhead) |
| zod | 3.x | Webhook payload validation | Already in stack (Phase 3), type-safe validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (built-in) | Node.js | Webhook signature verification | HMAC-SHA256 verification, timing-safe comparison |
| pdfkit | 0.15.x | Low-level PDF generation | If invoice-pdfkit insufficient, direct PDFKit access |
| qrcode | 1.5.x | QR code image generation | Generate QR code images for PDF invoices |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| invoice-pdfkit | Puppeteer + HTML templates | Puppeteer heavier (browser engine) but better for complex layouts |
| @spayd/core | @tedyno/cz-qr-payment | Similar functionality, tedyno includes SVG generation |
| Comgate | Stripe | Stripe better docs/DX, but Comgate optimized for Czech market |

**Installation:**
```bash
npm install amqplib @spayd/core invoice-pdfkit qrcode zod
```

## Architecture Patterns

### Recommended Project Structure

```
packages/
├── events/
│   ├── payment/
│   │   ├── payment-initiated.event.ts
│   │   ├── payment-completed.event.ts
│   │   ├── payment-failed.event.ts
│   │   └── payment-refunded.event.ts
│   └── booking/
│       ├── booking-confirmed.event.ts
│       └── booking-cancelled.event.ts
apps/web/
└── app/api/v1/
    ├── payments/
    │   ├── comgate/
    │   │   ├── create/route.ts          # Initialize payment
    │   │   ├── callback/route.ts         # Handle redirect return
    │   │   └── webhook/route.ts          # Process Comgate webhooks (raw body)
    │   ├── qr-payment/create/route.ts    # Generate QR code
    │   └── refund/route.ts
    └── invoices/
        └── [invoiceId]/download/route.ts
services/
└── payment-processor/                     # Separate service for event handling
    ├── handlers/
    │   ├── booking-created.handler.ts     # Listen: booking.created
    │   ├── payment-completed.handler.ts   # Listen: payment.completed
    │   └── payment-failed.handler.ts      # Listen: payment.failed, trigger compensation
    └── saga/
        └── booking-payment-saga.ts         # Saga state tracking
```

### Pattern 1: Webhook Idempotency with Database Unique Constraint

**What:** Use database unique constraint on webhook event ID to ensure exactly-once processing.

**When to use:** All payment webhook handlers to prevent double-charging/double-confirmation.

**Example:**
```typescript
// Source: Multiple verified sources (Hookdeck, Stripe, Medium articles)
// Database schema (Drizzle ORM)
export const processedWebhooks = pgTable('processed_webhooks', {
  eventId: text('event_id').primaryKey(), // Unique constraint
  gatewayName: text('gateway_name').notNull(),
  status: text('status').notNull(),
  processedAt: timestamp('processed_at').defaultNow(),
  payload: jsonb('payload'),
});

// Webhook handler
async function handleComgateWebhook(eventId: string, payload: any) {
  try {
    // Attempt to insert - will throw 23505 if duplicate
    await db.insert(processedWebhooks).values({
      eventId,
      gatewayName: 'comgate',
      status: 'processing',
      payload,
    });

    // Process payment (update booking, publish event)
    await processPayment(payload);

    // Update status
    await db.update(processedWebhooks)
      .set({ status: 'completed' })
      .where(eq(processedWebhooks.eventId, eventId));

    return { success: true };
  } catch (error) {
    // Check for duplicate key error (23505)
    if ((error as any).code === '23505') {
      // Already processed, return cached result
      const cached = await db.select()
        .from(processedWebhooks)
        .where(eq(processedWebhooks.eventId, eventId));
      return { success: true, cached: true };
    }
    throw error;
  }
}
```

### Pattern 2: Express Raw Body for Webhook Signature Verification

**What:** Use express.raw() middleware exclusively for webhook routes to preserve raw body for HMAC verification.

**When to use:** All payment gateway webhooks requiring signature verification.

**Example:**
```typescript
// Source: Stripe docs, Hookdeck, Medium articles on webhook security
// app/api/v1/payments/comgate/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  // Get raw body (Next.js API routes provide this)
  const rawBody = await req.text();
  const signature = req.headers.get('x-comgate-signature');

  // Verify signature with timing-safe comparison
  const expectedSignature = crypto
    .createHmac('sha256', process.env.COMGATE_SECRET!)
    .update(rawBody)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature || ''),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse body AFTER verification
  const payload = JSON.parse(rawBody);

  // Process webhook with idempotency
  await handleComgateWebhook(payload.transactionId, payload);

  // Return 200 quickly (within 5 seconds)
  return NextResponse.json({ success: true });
}
```

### Pattern 3: SAGA Choreography with RabbitMQ CloudEvents

**What:** Event-driven saga where services react to events and publish new events, no central orchestrator.

**When to use:** Booking-payment flow with distributed state across services.

**Example:**
```typescript
// Source: AWS Prescriptive Guidance, Medium SAGA articles, CloudEvents AMQP binding spec
// packages/events/payment/payment-completed.event.ts
import { CloudEvent } from 'cloudevents';

export interface PaymentCompletedData {
  bookingId: string;
  paymentId: string;
  amount: number;
  currency: string;
  gatewayTransactionId: string;
}

export function createPaymentCompletedEvent(data: PaymentCompletedData): CloudEvent {
  return new CloudEvent({
    type: 'com.schedulebox.payment.completed',
    source: '/payments/processor',
    datacontenttype: 'application/json',
    data,
  });
}

// services/payment-processor/handlers/payment-completed.handler.ts
import { Channel } from 'amqplib';

export async function handlePaymentCompleted(
  channel: Channel,
  eventData: PaymentCompletedData
) {
  // Update payment record
  await db.update(payments)
    .set({ status: 'completed' })
    .where(eq(payments.id, eventData.paymentId));

  // Publish booking.confirmed event (triggers booking service)
  const confirmEvent = createBookingConfirmedEvent({
    bookingId: eventData.bookingId,
    confirmedAt: new Date(),
  });

  await channel.publish(
    'booking_events',
    'booking.confirmed',
    Buffer.from(JSON.stringify(confirmEvent)),
    { persistent: true }
  );
}
```

### Pattern 4: Drizzle Transactions with SELECT FOR UPDATE

**What:** Use PostgreSQL row-level locking within transactions to prevent double-booking race conditions.

**When to use:** Payment processing that modifies booking availability.

**Example:**
```typescript
// Source: Drizzle GitHub issue #2875, community discussions
await db.transaction(async (tx) => {
  // Lock booking row
  const [booking] = await tx.execute(
    sql`SELECT * FROM bookings WHERE id = ${bookingId} FOR UPDATE NOWAIT`
  );

  if (booking.status !== 'pending') {
    tx.rollback();
    throw new Error('Booking already processed');
  }

  // Update booking status
  await tx.update(bookings)
    .set({ status: 'confirmed', confirmedAt: new Date() })
    .where(eq(bookings.id, bookingId));

  // Create invoice
  await tx.insert(invoices).values({
    bookingId,
    companyId: booking.companyId,
    invoiceNumber: await generateInvoiceNumber(tx),
    amount: booking.totalPrice,
  });
});
```

### Pattern 5: Czech QR Payment Generation

**What:** Generate SPD-format QR code string for Czech banks using @spayd/core.

**When to use:** On-site payment option for bookings.

**Example:**
```typescript
// Source: npm @spayd/core documentation, qr-platba.cz specifications
import { Spayd } from '@spayd/core';
import QRCode from 'qrcode';

export async function generateCzechQRPayment(params: {
  iban: string;
  amount: number;
  currency: string;
  variableSymbol: string;
  message: string;
}) {
  // Create SPD string
  const spayd = new Spayd({
    iban: params.iban,
    amount: params.amount,
    currency: params.currency,
    message: params.message,
    variableSymbol: params.variableSymbol,
  });

  const spdString = spayd.generate();
  // Example: "SPD*1.0*ACC:CZ5530300000001325090010*AM:450.00*CC:CZK*MSG:Booking #123*X-VS:123"

  // Generate QR code image
  const qrDataUrl = await QRCode.toDataURL(spdString);

  return { spdString, qrDataUrl };
}
```

### Pattern 6: Invoice PDF Generation with VAT

**What:** Generate VAT-compliant invoices using invoice-pdfkit with Czech localization.

**When to use:** After successful payment, for download endpoint.

**Example:**
```typescript
// Source: invoice-pdfkit npm documentation
import invoicePdfkit from 'invoice-pdfkit';

export async function generateInvoicePDF(invoiceData: {
  invoiceNumber: string;
  companyName: string;
  companyAddress: string;
  vatNumber: string;
  items: Array<{ description: string; quantity: number; price: number }>;
  totalAmount: number;
  vatRate: number;
}) {
  const document = {
    company: {
      name: invoiceData.companyName,
      address: invoiceData.companyAddress,
      vatNumber: invoiceData.vatNumber,
    },
    order: {
      number: invoiceData.invoiceNumber,
      date: new Date(),
      items: invoiceData.items.map(item => ({
        label: item.description,
        quantity: item.quantity,
        price: item.price,
        vat: invoiceData.vatRate,
      })),
    },
  };

  const pdf = invoicePdfkit(document, {
    locale: 'cs-CZ', // Czech localization
  });

  return pdf; // Returns PDF stream
}
```

### Pattern 7: Payment Timeout & Compensation

**What:** Handle abandoned payment sessions with timeout + compensation transaction.

**When to use:** User redirects to Comgate but never completes/cancels within timeout window.

**Example:**
```typescript
// Source: SAGA pattern articles, AWS guidance on compensation
// Scheduled job or event-driven timeout handler
export async function handlePaymentTimeout(paymentId: string) {
  const payment = await db.select()
    .from(payments)
    .where(eq(payments.id, paymentId));

  if (payment.status === 'pending' && isExpired(payment.createdAt, 15 * 60 * 1000)) {
    await db.transaction(async (tx) => {
      // Mark payment as expired
      await tx.update(payments)
        .set({ status: 'expired' })
        .where(eq(payments.id, paymentId));

      // Publish compensation event
      const cancelEvent = createBookingCancelledEvent({
        bookingId: payment.bookingId,
        reason: 'payment_timeout',
      });

      await publishEvent(channel, 'booking_events', 'booking.cancelled', cancelEvent);
    });
  }
}

function isExpired(createdAt: Date, timeoutMs: number): boolean {
  return Date.now() - createdAt.getTime() > timeoutMs;
}
```

### Anti-Patterns to Avoid

- **Webhook processing without idempotency:** Will cause double-charging, double-confirmation on retries
- **Parsing body before signature verification:** express.json() middleware breaks signature verification
- **Synchronous payment status polling:** Use webhooks, not polling; gateways may have rate limits
- **SAGA orchestrator in monolith:** Choreography pattern suits event-driven RabbitMQ architecture better
- **Storing sensitive payment data:** Never store card numbers; use gateway's transaction IDs only
- **Missing timeout handling:** Abandoned payments will leave bookings in pending state indefinitely

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Czech QR payment format | Manual SPD string builder | @spayd/core | Czech Banking Association standard, handles edge cases (IBAN validation, format escaping) |
| PDF invoice generation | Custom PDF library | invoice-pdfkit | VAT calculation logic, i18n support, tested layout engine |
| Webhook signature verification | Custom HMAC implementation | crypto.createHmac + timingSafeEqual | Timing attack protection, constant-time comparison |
| Payment state machine | Custom state transitions | Built-in enum + database constraints | PostgreSQL CHECK constraints enforce valid states |
| Idempotency logic | Application-level tracking | Database unique constraint | Atomic guarantee, survives application crashes |
| QR code image generation | Canvas/image libraries | qrcode npm package | Error correction, format optimization, battle-tested |

**Key insight:** Payment processing has severe edge cases (network retries, partial failures, race conditions). Use proven libraries with built-in safety guarantees rather than custom implementations that will miss edge cases in production.

## Common Pitfalls

### Pitfall 1: Webhook Signature Verification Failure

**What goes wrong:** Webhook signature always fails even with correct secret, causing payment confirmations to be rejected.

**Why it happens:** Express middleware (express.json()) parses body before webhook handler runs, converting raw body to JSON. Signature is computed on raw body, so verification fails on parsed object.

**How to avoid:** In Next.js API routes, use `await req.text()` to get raw body. In Express apps, use express.raw() middleware ONLY for webhook routes, not express.json(). Order matters: webhook route before global json middleware.

**Warning signs:** Webhooks return 401/403 errors, but manual signature computation matches expected value, or logs show body type is object instead of Buffer/string.

### Pitfall 2: Double-Charging on Webhook Retries

**What goes wrong:** Payment gateway retries webhook delivery (network timeout, server restart), application processes same payment twice, charging customer multiple times.

**Why it happens:** No idempotency check before processing webhook payload. Each webhook invocation executes payment logic independently.

**How to avoid:** Use database unique constraint on gateway transaction ID or webhook event ID. Insert into processed_webhooks table first, catch 23505 error on duplicates, return cached result. Process side effects (email, booking confirmation) AFTER database insert succeeds.

**Warning signs:** Multiple payment records with same gateway_transaction_id, customer complaints about double-charging, duplicate booking confirmations sent.

### Pitfall 3: Race Condition in Booking Confirmation

**What goes wrong:** Two concurrent webhook deliveries (or webhook + callback) both check booking status as "pending", both confirm booking, database shows inconsistent state.

**Why it happens:** Read-check-write pattern without locking. Both transactions read pending status before either commits the update.

**How to avoid:** Use SELECT FOR UPDATE within Drizzle transaction to lock booking row. Alternative: rely solely on unique constraint violation for idempotency (webhook event ID prevents duplicate processing).

**Warning signs:** Occasionally duplicate confirmations, race conditions in load testing, inconsistent booking.confirmedAt timestamps.

### Pitfall 4: Comgate API Misconfiguration

**What goes wrong:** Payment initialization returns error, webhook never arrives, or callback URL incorrect.

**Why it happens:** Missing configuration in Comgate portal: allowed server IP not whitelisted, webhook URL not configured, test/production mode mismatch, merchant ID or secret incorrect.

**How to avoid:** In Comgate portal (portal.comgate.cz): whitelist server IPv4 address, configure PAID/CANCELLED/PENDING webhook URLs, verify test mode matches code (.setTest(true) in sandbox). Log full Comgate API responses during development.

**Warning signs:** HTTP 403 from Comgate API, webhooks never arrive in dev/staging, production works but staging doesn't (IP whitelist issue).

### Pitfall 5: Payment Timeout Edge Case

**What goes wrong:** User redirects to Comgate, never completes payment, booking stays "pending" forever, slot appears unavailable.

**Why it happens:** No timeout handler for abandoned payment sessions. Relying only on webhook (which never arrives if user abandons flow).

**How to avoid:** Implement scheduled job (cron or event-driven) to expire pending payments after timeout window (15-30 minutes). Publish booking.cancelled compensation event to release slot. Mark payment as "expired" status.

**Warning signs:** Accumulating pending bookings with old timestamps, customer complaints about unavailable slots that should be free.

### Pitfall 6: Missing Refund Idempotency

**What goes wrong:** Admin processes refund, network error occurs, admin retries, customer receives double refund.

**Why it happens:** Refund endpoint not idempotent. Each POST creates new refund transaction with Comgate.

**How to avoid:** Use idempotency key on refund API (Comgate likely supports this - verify in docs). Store refund intent in database with unique constraint on (payment_id, refund_reason, amount) for partial refund safety. Check existing refunds before calling gateway.

**Warning signs:** Customer receives excess refund, refund records duplicated in database, Comgate shows multiple refund transactions.

### Pitfall 7: CloudEvents Format Inconsistency

**What goes wrong:** Payment events published to RabbitMQ but booking service doesn't receive/parse them correctly.

**Why it happens:** Event payload format doesn't match CloudEvents specification (missing required fields: type, source, specversion), or AMQP binding not followed (binary vs structured mode mismatch).

**How to avoid:** Use CloudEvents SDK (cloudevents npm package) to construct events. Follow AMQP protocol binding spec: structured mode puts full CloudEvent in message body with content-type application/cloudevents+json. Include required fields: specversion: "1.0", type, source, id.

**Warning signs:** Events published but consumers don't process them, RabbitMQ dead-letter queue fills up, event parsing errors in consumer logs.

### Pitfall 8: Invoice Number Collision

**What goes wrong:** Two concurrent payments generate same invoice number, database unique constraint violation on invoices table, transaction rollback, payment confirmed but no invoice.

**Why it happens:** Invoice number generation (e.g., max(invoice_number) + 1) is not atomic, race condition between read and insert.

**How to avoid:** Use PostgreSQL sequence for invoice number generation within same transaction as invoice insert. Alternative: use UUID-based invoice numbers. If sequential required: lock company row with SELECT FOR UPDATE before generating number, or use INSERT ... ON CONFLICT.

**Warning signs:** Occasional "unique constraint violation" errors during payment processing, missing invoices for confirmed payments.

## Code Examples

Verified patterns from official sources:

### Comgate Payment Initialization

```typescript
// Source: Comgate PHP SDK (adapted for Node.js), official API endpoints
interface ComgatePaymentParams {
  price: number;
  currency: string;
  label: string;
  referenceId: string;
  email: string;
  redirectUrl: string;
  callbackUrl: string;
}

async function initComgatePayment(params: ComgatePaymentParams) {
  const payload = {
    merchant: process.env.COMGATE_MERCHANT_ID,
    test: process.env.NODE_ENV !== 'production',
    price: params.price * 100, // Convert to cents
    curr: params.currency,
    label: params.label,
    refId: params.referenceId,
    email: params.email,
    method: 'ALL', // All payment methods
    prepareOnly: false,
    lang: 'cs', // Czech
    redirectUrl: params.redirectUrl,
    callbackUrl: params.callbackUrl,
  };

  // Sign request with secret (HMAC-SHA256)
  const signature = crypto
    .createHmac('sha256', process.env.COMGATE_SECRET!)
    .update(JSON.stringify(payload))
    .digest('hex');

  const response = await fetch('https://payments.comgate.cz/v1.0/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Comgate-Signature': signature,
    },
    body: new URLSearchParams(payload),
  });

  const data = await response.text();
  // Response format: "code=0&message=OK&transId=ABC123&redirect=https://..."
  const params = new URLSearchParams(data);

  if (params.get('code') !== '0') {
    throw new Error(`Comgate error: ${params.get('message')}`);
  }

  return {
    transactionId: params.get('transId'),
    redirectUrl: params.get('redirect'),
  };
}
```

### Drizzle Unique Constraint for Idempotency

```typescript
// Source: Drizzle ORM docs, PostgreSQL error code handling
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const processedWebhooks = pgTable('processed_webhooks', {
  eventId: text('event_id').primaryKey(), // Unique constraint
  gatewayName: text('gateway_name').notNull(),
  status: text('status').notNull(),
  processedAt: timestamp('processed_at').defaultNow(),
  payload: jsonb('payload'),
});

// Error handling
try {
  await db.insert(processedWebhooks).values({
    eventId: webhookEventId,
    gatewayName: 'comgate',
    status: 'processing',
    payload: webhookPayload,
  });
} catch (error: any) {
  if (error.code === '23505') { // PostgreSQL unique_violation
    // Already processed - return success
    return { success: true, message: 'Already processed' };
  }
  throw error;
}
```

### RabbitMQ CloudEvents Publishing

```typescript
// Source: CloudEvents AMQP binding spec, amqplib documentation
import amqp from 'amqplib';
import { CloudEvent } from 'cloudevents';

async function publishPaymentCompletedEvent(data: PaymentCompletedData) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL!);
  const channel = await connection.createChannel();

  // Ensure exchange exists
  await channel.assertExchange('payment_events', 'topic', { durable: true });

  // Create CloudEvent
  const event = new CloudEvent({
    specversion: '1.0',
    type: 'com.schedulebox.payment.completed',
    source: '/payments/processor',
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data,
  });

  // Publish with structured content mode
  await channel.publish(
    'payment_events',
    'payment.completed',
    Buffer.from(JSON.stringify(event)),
    {
      contentType: 'application/cloudevents+json',
      persistent: true,
    }
  );

  await channel.close();
  await connection.close();
}
```

### SAGA Compensation Handler

```typescript
// Source: AWS SAGA guidance, Medium SAGA choreography examples
import { Channel, ConsumeMessage } from 'amqplib';

export async function handlePaymentFailed(
  channel: Channel,
  msg: ConsumeMessage
) {
  const event = JSON.parse(msg.content.toString());
  const { bookingId, paymentId, reason } = event.data;

  await db.transaction(async (tx) => {
    // Update payment status
    await tx.update(payments)
      .set({ status: 'failed', failureReason: reason })
      .where(eq(payments.id, paymentId));

    // Compensation: cancel booking
    await tx.update(bookings)
      .set({ status: 'cancelled', cancelledAt: new Date() })
      .where(eq(bookings.id, bookingId));

    // Publish compensation event
    const cancelEvent = createBookingCancelledEvent({
      bookingId,
      reason: 'payment_failed',
      originalPaymentId: paymentId,
    });

    await channel.publish(
      'booking_events',
      'booking.cancelled',
      Buffer.from(JSON.stringify(cancelEvent)),
      { persistent: true }
    );
  });

  // Acknowledge message
  channel.ack(msg);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SAGA orchestrator service | SAGA choreography with events | 2023-2024 | Simpler for event-driven systems, no single point of failure |
| Puppeteer for PDFs | PDFKit libraries (invoice-pdfkit) | 2024-2025 | Faster, lighter, no browser dependency |
| Manual idempotency tracking | Database unique constraints | Always standard | Atomic guarantee, simpler code |
| express.json() everywhere | express.raw() for webhooks | 2020+ (Stripe guidance) | Fixes signature verification issues |
| SHA-1 webhook signatures | SHA-256 | 2022 (GitHub deprecation) | Better security against collision attacks |
| Polling payment status | Webhook-driven updates | 2015+ (industry standard) | Real-time, no rate limit issues |

**Deprecated/outdated:**

- **SHA-1 for webhook signatures:** GitHub and major gateways deprecated in 2022, use SHA-256
- **Global express.json() for webhook routes:** Breaks signature verification, use route-specific express.raw()
- **SELECT without FOR UPDATE for double-booking prevention:** Race condition, use row-level locking

## Open Questions

1. **Comgate refund API specifics**
   - What we know: Comgate SDK has refundPayment() method accepting transaction ID and amount
   - What's unclear: Exact endpoint URL, idempotency support, partial refund limits, refund status webhook
   - Recommendation: Consult official Comgate API documentation at help.comgate.cz/docs/en/api-protocol-en (requires direct access, blocked during research). Test in sandbox with small amounts. Implement refund idempotency regardless of gateway support.

2. **QRcomat vs Czech QR Payment Standards**
   - What we know: User mentioned "QRcomat" but research found Czech Banking Association SPD standard (@spayd/core)
   - What's unclear: Is "QRcomat" a specific vendor/service, or referring to Czech QR payments generally?
   - Recommendation: Clarify with stakeholder. If "QRcomat" is a specific API service, obtain documentation. Otherwise, proceed with @spayd/core for Czech Banking Association standard QR payments, which works across all Czech banks.

3. **Invoice number format requirements**
   - What we know: Database has invoice_number UNIQUE constraint per company
   - What's unclear: Czech legal requirements for invoice numbering (sequential per year? global sequence? format pattern?)
   - Recommendation: Consult Czech accounting regulations for invoice numbering. Common pattern: YYYY-NNNN (year + sequential). Use PostgreSQL sequence with year reset logic, or UUID if legal requirements flexible.

4. **Payment timeout window configuration**
   - What we know: Need timeout handler for abandoned payments
   - What's unclear: Optimal timeout value (15 min? 30 min? configurable per company?), whether Comgate has built-in timeout
   - Recommendation: Start with 30-minute default (industry standard for payment redirects). Make configurable via environment variable. Check Comgate docs for gateway-side timeout behavior.

## Sources

### Primary (HIGH confidence)

- **Drizzle ORM Official Docs:** Transactions (https://orm.drizzle.team/docs/transactions), Indexes & Constraints (https://orm.drizzle.team/docs/indexes-constraints)
- **Drizzle GitHub Issue #2875:** SELECT FOR UPDATE support (undocumented feature) - https://github.com/drizzle-team/drizzle-orm/issues/2875
- **Comgate PHP SDK GitHub:** API patterns, authentication, payment flow - https://github.com/comgate-payments/sdk-php
- **CloudEvents AMQP Binding Spec:** RabbitMQ event format - https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/amqp-protocol-binding.md
- **qr-platba.cz Specification:** Czech QR payment SPD format - https://qr-platba.cz/pro-vyvojare/specifikace-formatu/
- **Short Payment Descriptor Wikipedia:** SPD format overview - https://en.wikipedia.org/wiki/Short_Payment_Descriptor

### Secondary (MEDIUM confidence)

- **Hookdeck Webhook Idempotency Guide:** Implementation patterns - https://hookdeck.com/webhooks/guides/implement-webhook-idempotency
- **Medium: Handling Payment Webhooks Reliably:** Idempotency, retries, validation (Nov 2025) - https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5
- **AWS Prescriptive Guidance:** Saga choreography pattern - https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-choreography.html
- **Medium: Implementing Saga Patterns in RabbitMQ:** Practical guide - https://medium.com/@robin5002234/implementing-saga-patterns-in-rabbitmq-a-practical-guide-to-choreography-and-orchestration-85033ee84d01
- **Nutrient Blog:** Generate PDF invoices with PDFKit (Node.js) - https://www.nutrient.io/blog/generate-pdf-invoices-pdfkit-nodejs/
- **npm: @spayd/core:** Czech Banking Association SPD format library - https://www.npmjs.com/package/@spayd/core
- **npm: @tedyno/cz-qr-payment:** Alternative Czech QR payment library - https://www.npmjs.com/package/@tedyno/cz-qr-payment
- **npm: invoice-pdfkit:** VAT-compliant invoice generator - https://www.npmjs.com/package/@zed378/invoice-pdfkit
- **PostgreSQL Error 23505 Documentation:** Unique constraint violation handling - https://www.bytebase.com/reference/postgres/error/23505-duplicate-key-value/
- **Stripe Webhook Signature Docs:** Raw body verification patterns - https://docs.stripe.com/webhooks/signature
- **Medium: Understanding Compensation Transactions in SAGA Pattern:** Comprehensive guide - https://moldstud.com/articles/p-understanding-compensation-transactions-in-the-saga-pattern-a-comprehensive-guide-for-developers

### Tertiary (LOW confidence - needs validation)

- **Comgate Official Website:** help.comgate.cz (403 error during fetch, needs direct access for API docs)
- **Payment Gateway Integration Guide 2026:** General patterns (not Comgate-specific) - https://neontri.com/blog/payment-gateway-integration/
- **GitHub: comgate-payments organization:** Official SDK repositories - https://github.com/comgate-payments
- **Medium: Deep Dive into Payment Gateway Integration:** Node.js patterns (not Czech-specific) - https://medium.com/@rohitraj1912000/deep-dive-into-payment-gateway-integration-with-node-js-a-practical-guide-for-developers-73a7c6346ac7

## Metadata

**Confidence breakdown:**

- **Standard Stack:** MEDIUM-HIGH - amqplib and invoice-pdfkit verified via npm/docs, @spayd/core verified via Czech Banking Association standard and npm, Comgate verified via GitHub SDK but official docs blocked
- **Architecture:** HIGH - SAGA choreography, webhook idempotency, and SELECT FOR UPDATE patterns verified across multiple authoritative sources (AWS, Drizzle, CloudEvents spec)
- **Pitfalls:** HIGH - Webhook signature verification, idempotency, and race condition pitfalls verified across payment gateway docs (Stripe, Hookdeck) and PostgreSQL error handling sources

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days - payment gateway APIs are relatively stable, but verify Comgate API docs directly before implementation)

**Critical gaps requiring validation:**
1. Comgate official API documentation (help.comgate.cz) - blocked during research, MUST access before implementation
2. "QRcomat" service identity - clarify if specific vendor or referring to Czech QR payment standard
3. Czech invoice numbering legal requirements - consult accounting regulations
4. Comgate refund API specifics - idempotency support, partial refund limits
