# Phase 7: Notifications & Automation - Research

**Researched:** 2026-02-11
**Domain:** Notification delivery (email/SMS/push), template rendering, job scheduling, RabbitMQ event consumers, visual automation rule builder
**Confidence:** HIGH

## Summary

Phase 7 implements a comprehensive notification and automation system that listens to RabbitMQ events (booking.created, payment.completed, etc.) and triggers multi-channel notifications (email, SMS, push) based on templates and automation rules. The system builds on the existing RabbitMQ publisher infrastructure (Phase 5) by adding consumer workers, scheduled job processing with BullMQ, and a visual rule builder UI.

The research reveals that Nodemailer with SMTP transport remains the most reliable choice for email sending in Node.js, paired with Handlebars for template rendering and variable interpolation. BullMQ provides Redis-backed job scheduling with excellent support for delayed notifications (24h/2h reminders). For SMS, Twilio offers the most mature API with environment variable configuration. Web push notifications use the standard Service Worker API with the web-push library. The visual automation builder uses React Flow, which powers workflow editors at Stripe and Typeform.

Critical architectural insight: notification consumers must be idempotent because RabbitMQ delivers at-least-once. Use BullMQ's job deduplication (jobId from event UUID) to prevent duplicate sends. Template rendering happens synchronously in-process (Handlebars compiles to functions), but delivery is asynchronous through BullMQ queues with exponential backoff retry.

**Primary recommendation:** Implement notification consumers as standalone workers (separate process from Next.js API) that subscribe to booking.*, payment.*, and review.* events, render templates with Handlebars, and enqueue delivery jobs to BullMQ. Use separate queues per channel (email-queue, sms-queue, push-queue) with channel-specific retry policies. Store tracking pixels in email templates to update notification.opened_at, and rewrite links to track notification.clicked_at.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| amqplib | 0.10.9 | RabbitMQ consumer client | Already installed, callback and promise APIs, official AMQP 0-9-1 implementation |
| BullMQ | 5.x | Redis-backed job queue for scheduled notifications | Modern successor to Bull, TypeScript-first, superior delayed job support, 2.8M+ weekly downloads |
| Nodemailer | 6.x | SMTP email sending | Industry standard (6.5M+ weekly downloads), battle-tested since 2010, zero runtime dependencies |
| Handlebars | 4.x | Template engine for email/SMS rendering | Lightweight, logic-less, compiles to fast JS functions, 5M+ weekly downloads |
| Twilio SDK | 5.x | SMS sending via Twilio API | Most mature SMS provider, excellent Node.js SDK, 1.3M+ weekly downloads |
| web-push | 3.x | Web push notification protocol implementation | Standard VAPID protocol, handles encryption, works with all browsers |
| React Flow | 11.x | Visual automation rule builder UI | Powers Stripe/Typeform workflow editors, 750K+ weekly downloads, excellent TypeScript support |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mjml-react | 3.x | Responsive email HTML generation | For complex responsive emails (not needed for MVP simple templates) |
| react-email | 2.x | React components for email | Alternative to MJML, better DX but less mature (consider for Phase 2) |
| pxl-for-emails | 1.x | Email open/click tracking | For tracking pixel endpoints and link rewriting |
| @react-email/components | Latest | Pre-built email components | If using react-email instead of Handlebars |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nodemailer | Resend API | Resend has excellent DX and Vercel integration, but adds vendor lock-in and costs scale with volume. Nodemailer with SMTP is flexible and self-hostable. |
| Handlebars | React Email | React Email offers better type safety and component reusability, but requires build step and more complex setup. Handlebars is simpler for basic variable interpolation. |
| BullMQ | Agenda | Agenda uses MongoDB (not Redis) so wouldn't leverage existing infrastructure. BullMQ has better performance and feature set. |
| Twilio | Vonage/MessageBird | Similar pricing and features. Twilio chosen for market leadership and SDK maturity. |

**Installation:**
```bash
pnpm add bullmq nodemailer handlebars twilio web-push react-flow
pnpm add -D @types/nodemailer @types/web-push
```

## Architecture Patterns

### Recommended Project Structure

```
services/
├── notification-worker/           # Standalone Node.js worker process
│   ├── src/
│   │   ├── consumers/
│   │   │   ├── booking-consumer.ts       # Listens to booking.* events
│   │   │   ├── payment-consumer.ts       # Listens to payment.* events
│   │   │   ├── automation-consumer.ts    # Listens to automation.rule.triggered
│   │   │   └── index.ts                  # Consumer orchestrator
│   │   ├── jobs/
│   │   │   ├── email-job.ts              # BullMQ job handler for email
│   │   │   ├── sms-job.ts                # BullMQ job handler for SMS
│   │   │   ├── push-job.ts               # BullMQ job handler for push
│   │   │   └── index.ts                  # Job queue setup
│   │   ├── templates/
│   │   │   ├── email/
│   │   │   │   ├── booking-confirmation.hbs
│   │   │   │   ├── booking-reminder.hbs
│   │   │   │   ├── review-request.hbs
│   │   │   │   └── layout.hbs            # Shared email layout
│   │   │   └── sms/
│   │   │       ├── booking-confirmation.hbs
│   │   │       └── booking-reminder.hbs
│   │   ├── services/
│   │   │   ├── email-sender.ts           # Nodemailer wrapper
│   │   │   ├── sms-sender.ts             # Twilio wrapper
│   │   │   ├── push-sender.ts            # web-push wrapper
│   │   │   ├── template-renderer.ts      # Handlebars compilation
│   │   │   └── notification-logger.ts    # Update DB status
│   │   └── index.ts                      # Worker entrypoint
│   ├── package.json
│   └── tsconfig.json
apps/web/
├── app/
│   └── api/
│       └── v1/
│           ├── notifications/
│           │   ├── route.ts              # GET list notifications
│           │   └── [id]/route.ts         # GET single notification
│           ├── notification-templates/
│           │   ├── route.ts              # GET, POST templates
│           │   ├── [id]/route.ts         # GET, PUT, DELETE template
│           │   └── [id]/preview/route.ts # POST preview with test data
│           ├── automation/
│           │   ├── rules/
│           │   │   ├── route.ts          # GET, POST automation rules
│           │   │   ├── [id]/route.ts     # GET, PUT, DELETE rule
│           │   │   └── [id]/toggle/route.ts # POST activate/deactivate
│           │   └── logs/route.ts         # GET automation execution logs
│           └── webhooks/
│               ├── email-tracking/
│               │   ├── open/route.ts     # GET tracking pixel
│               │   └── click/route.ts    # GET link redirect + track
│               └── push/
│                   └── register/route.ts # POST push subscription
├── app/[locale]/
│   └── (dashboard)/
│       ├── notifications/
│       │   └── page.tsx                  # Notification history UI
│       ├── templates/
│       │   ├── page.tsx                  # Template list + editor
│       │   └── [id]/page.tsx             # Template detail editor
│       └── automation/
│           ├── page.tsx                  # Automation rules list
│           ├── builder/page.tsx          # Visual rule builder (React Flow)
│           └── logs/page.tsx             # Automation execution logs
```

### Pattern 1: RabbitMQ Event Consumer with Idempotent Processing

**What:** Consumer worker that subscribes to RabbitMQ events, extracts booking/payment data, renders notification template, and enqueues delivery job to BullMQ with deduplication.

**When to use:** Every notification trigger (booking.created, booking.completed, payment.confirmed, etc.).

**Example:**
```typescript
// services/notification-worker/src/consumers/booking-consumer.ts
import { Channel, ConsumeMessage } from 'amqplib';
import { Queue } from 'bullmq';
import { db } from '@schedulebox/database';
import { bookings, customers, services, notificationTemplates } from '@schedulebox/database/schema';
import { eq, and } from 'drizzle-orm';
import type { CloudEvent, BookingCreatedPayload } from '@schedulebox/events';
import { renderTemplate } from '../services/template-renderer.js';

const EXCHANGE_NAME = 'schedulebox.events';
const QUEUE_NAME = 'notification-worker.booking';
const ROUTING_KEYS = ['booking.created', 'booking.confirmed', 'booking.completed', 'booking.cancelled'];

export async function setupBookingConsumer(channel: Channel, emailQueue: Queue) {
  // Assert queue and bind to routing keys
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  for (const routingKey of ROUTING_KEYS) {
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, routingKey);
  }

  // Consume messages with prefetch limit (process 10 at a time)
  channel.prefetch(10);
  channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const event: CloudEvent<BookingCreatedPayload> = JSON.parse(msg.content.toString());

      // Handle booking.created -> send confirmation email
      if (event.type === 'com.schedulebox.booking.created') {
        await handleBookingCreated(event, emailQueue);
      }

      // Handle booking.completed -> schedule review request (2h delay)
      if (event.type === 'com.schedulebox.booking.completed') {
        await handleBookingCompleted(event, emailQueue);
      }

      // ACK message after successful processing
      channel.ack(msg);
    } catch (error) {
      console.error('[BookingConsumer] Error processing message:', error);

      // NACK and requeue (will retry later)
      // In production, implement dead-letter queue after N retries
      channel.nack(msg, false, true);
    }
  });

  console.log(`[BookingConsumer] Listening to ${ROUTING_KEYS.join(', ')}`);
}

async function handleBookingCreated(
  event: CloudEvent<BookingCreatedPayload>,
  emailQueue: Queue
) {
  const { bookingUuid, companyId } = event.data;

  // Fetch booking details with related data
  const booking = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.uuid, bookingUuid),
      eq(bookings.companyId, companyId)
    ),
    with: {
      customer: true,
      service: true,
      employee: true,
    },
  });

  if (!booking || !booking.customer) {
    console.warn('[BookingConsumer] Booking or customer not found:', bookingUuid);
    return;
  }

  // Fetch email template for booking confirmation
  const template = await db.query.notificationTemplates.findFirst({
    where: and(
      eq(notificationTemplates.companyId, companyId),
      eq(notificationTemplates.type, 'booking_confirmation'),
      eq(notificationTemplates.channel, 'email'),
      eq(notificationTemplates.isActive, true)
    ),
  });

  if (!template) {
    console.warn('[BookingConsumer] No active booking_confirmation template for company:', companyId);
    return;
  }

  // Render template with booking data
  const html = renderTemplate(template.bodyTemplate, {
    customer_name: booking.customer.firstName,
    service_name: booking.service.name,
    booking_date: new Date(booking.startTime).toLocaleDateString('cs-CZ'),
    booking_time: new Date(booking.startTime).toLocaleTimeString('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    employee_name: booking.employee?.name || 'náš tým',
    company_name: 'TODO: fetch company name',
  });

  const subject = renderTemplate(template.subject || '', {
    customer_name: booking.customer.firstName,
    service_name: booking.service.name,
  });

  // Enqueue email delivery job with deduplication
  // jobId = event.id ensures idempotency (duplicate events won't create duplicate jobs)
  await emailQueue.add(
    'send-email',
    {
      companyId,
      bookingId: booking.id,
      customerId: booking.customer.id,
      templateId: template.id,
      recipient: booking.customer.email,
      subject,
      html,
      channel: 'email',
    },
    {
      jobId: event.id, // CRITICAL: Deduplication key
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 25s, 125s
      },
    }
  );

  console.log('[BookingConsumer] Enqueued confirmation email for booking:', bookingUuid);
}

async function handleBookingCompleted(
  event: CloudEvent<BookingCompletedPayload>,
  emailQueue: Queue
) {
  // Similar to handleBookingCreated, but with delay
  await emailQueue.add(
    'send-email',
    { /* ... */ },
    {
      jobId: `review-request-${event.id}`,
      delay: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
}
```

### Pattern 2: BullMQ Job Handler with SMTP Delivery

**What:** BullMQ worker that processes email delivery jobs, sends via Nodemailer SMTP, updates notification record status, and handles retry logic.

**When to use:** All email sending (confirmation, reminder, review request, etc.).

**Example:**
```typescript
// services/notification-worker/src/jobs/email-job.ts
import { Worker, Job } from 'bullmq';
import { db } from '@schedulebox/database';
import { notifications } from '@schedulebox/database/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../services/email-sender.js';

interface EmailJobData {
  companyId: number;
  bookingId?: number;
  customerId: number;
  templateId: number;
  recipient: string;
  subject: string;
  html: string;
  channel: 'email';
}

export function createEmailWorker(redisConnection: { host: string; port: number }) {
  const worker = new Worker<EmailJobData>(
    'email-queue',
    async (job: Job<EmailJobData>) => {
      const { companyId, bookingId, customerId, templateId, recipient, subject, html } = job.data;

      // Create notification record (if not exists from previous attempt)
      const [notification] = await db
        .insert(notifications)
        .values({
          companyId,
          customerId,
          bookingId: bookingId || null,
          templateId,
          channel: 'email',
          recipient,
          subject,
          body: html,
          status: 'pending',
          scheduledAt: new Date(),
          metadata: { jobId: job.id },
        })
        .onConflictDoNothing() // Idempotent: don't recreate if already exists
        .returning();

      const notificationId = notification?.id;

      try {
        // Send email via Nodemailer
        const messageId = await sendEmail({
          to: recipient,
          subject,
          html: injectTrackingPixel(html, notificationId),
          from: process.env.SMTP_FROM || 'noreply@schedulebox.cz',
        });

        // Update notification status to sent
        await db
          .update(notifications)
          .set({
            status: 'sent',
            sentAt: new Date(),
            metadata: { jobId: job.id, messageId },
          })
          .where(eq(notifications.id, notificationId));

        console.log(`[EmailWorker] Sent email to ${recipient}, notification #${notificationId}`);
        return { notificationId, messageId };
      } catch (error) {
        // Update notification status to failed
        await db
          .update(notifications)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          })
          .where(eq(notifications.id, notificationId));

        // Re-throw to trigger BullMQ retry
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process 5 emails in parallel
      limiter: {
        max: 100, // Max 100 emails
        duration: 60 * 1000, // Per minute (rate limiting)
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
}

/**
 * Inject tracking pixel into email HTML
 * Pixel URL: /api/webhooks/email-tracking/open?nid={notificationId}
 */
function injectTrackingPixel(html: string, notificationId: number): string {
  const pixelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/email-tracking/open?nid=${notificationId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;" />`;

  // Inject before closing </body> tag
  return html.replace('</body>', `${pixel}</body>`);
}
```

### Pattern 3: Handlebars Template Rendering with Variable Interpolation

**What:** Compile Handlebars templates with customer/booking/service data to generate personalized email/SMS content.

**When to use:** Before sending any notification (email or SMS).

**Example:**
```typescript
// services/notification-worker/src/services/template-renderer.ts
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

// Template cache (compile once, reuse many times)
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Render Handlebars template with data
 *
 * @param templateString - Handlebars template string
 * @param data - Variables to interpolate
 * @returns Rendered HTML/text
 */
export function renderTemplate(templateString: string, data: Record<string, any>): string {
  // Check cache
  let compiledTemplate = templateCache.get(templateString);

  if (!compiledTemplate) {
    // Compile template
    compiledTemplate = Handlebars.compile(templateString);
    templateCache.set(templateString, compiledTemplate);
  }

  // Render with data
  return compiledTemplate(data);
}

/**
 * Load template from file and render
 * Used for default templates (fallback if DB template not found)
 */
export function renderTemplateFile(
  templateName: string,
  data: Record<string, any>
): string {
  const templatePath = join(__dirname, '..', 'templates', 'email', `${templateName}.hbs`);
  const templateString = readFileSync(templatePath, 'utf-8');
  return renderTemplate(templateString, data);
}

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: string | Date, locale: string = 'cs-CZ') => {
  return new Date(date).toLocaleDateString(locale);
});

Handlebars.registerHelper('formatTime', (date: string | Date, locale: string = 'cs-CZ') => {
  return new Date(date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
});

Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'CZK') => {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(amount);
});
```

**Example template:**
```handlebars
{{!-- services/notification-worker/src/templates/email/booking-confirmation.hbs --}}
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4F46E5;">Potvrzení rezervace</h1>

    <p>Dobrý den, {{customer_name}}!</p>

    <p>Potvrzujeme vaši rezervace na <strong>{{service_name}}</strong>.</p>

    <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Datum:</strong> {{formatDate booking_date}}</p>
      <p><strong>Čas:</strong> {{formatTime booking_time}}</p>
      <p><strong>Zaměstnanec:</strong> {{employee_name}}</p>
      <p><strong>Cena:</strong> {{formatCurrency price currency}}</p>
    </div>

    <p>Těšíme se na vaši návštěvu!</p>

    <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
      {{company_name}}<br>
      Pokud chcete rezervaci zrušit, <a href="{{cancel_url}}">klikněte zde</a>.
    </p>
  </div>
</body>
</html>
```

### Pattern 4: React Flow Visual Automation Builder

**What:** Drag-and-drop UI for creating automation rules with trigger nodes, condition nodes, delay nodes, and action nodes that compile to JSONB stored in automation_rules table.

**When to use:** Automation rules management UI (admin/owner dashboard).

**Example:**
```typescript
// apps/web/app/[locale]/(dashboard)/automation/builder/page.tsx
'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'react-flow-renderer';
import TriggerNode from './nodes/TriggerNode';
import DelayNode from './nodes/DelayNode';
import ActionNode from './nodes/ActionNode';

const nodeTypes = {
  trigger: TriggerNode,
  delay: DelayNode,
  action: ActionNode,
};

interface AutomationBuilderProps {
  initialRuleId?: number;
}

export default function AutomationBuilder({ initialRuleId }: AutomationBuilderProps) {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: '1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        triggerType: 'booking_completed',
        label: 'Rezervace dokončena'
      },
    },
    {
      id: '2',
      type: 'delay',
      position: { x: 250, y: 200 },
      data: {
        delayMinutes: 120,
        label: '2 hodiny'
      },
    },
    {
      id: '3',
      type: 'action',
      position: { x: 250, y: 350 },
      data: {
        actionType: 'send_email',
        templateId: 5,
        label: 'Odeslat email: Review request'
      },
    },
  ]);

  const [edges, setEdges] = useState<Edge[]>([
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3', animated: true },
  ]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const handleSave = async () => {
    // Convert nodes/edges to automation_rules schema
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    const delayNode = nodes.find((n) => n.type === 'delay');
    const actionNode = nodes.find((n) => n.type === 'action');

    if (!triggerNode || !actionNode) {
      alert('Musíte mít alespoň trigger a akci');
      return;
    }

    const ruleData = {
      name: 'Review request po dokončení rezervace',
      triggerType: triggerNode.data.triggerType,
      triggerConfig: {},
      actionType: actionNode.data.actionType,
      actionConfig: {
        templateId: actionNode.data.templateId,
      },
      delayMinutes: delayNode?.data.delayMinutes || 0,
      isActive: true,
    };

    // Save to API
    const response = await fetch('/api/v1/automation/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData),
    });

    if (response.ok) {
      alert('Pravidlo uloženo!');
    }
  };

  return (
    <div className="h-screen">
      <div className="flex justify-between items-center p-4 bg-white border-b">
        <h1 className="text-2xl font-bold">Automation Builder</h1>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Uložit pravidlo
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
```

### Pattern 5: Review Routing Based on Star Rating

**What:** Automation rule that sends review request after booking completion, then routes based on response: 4-5 stars to Google/Facebook, 1-3 stars to internal feedback form.

**When to use:** Review request flow (NOTIF-09, NOTIF-10).

**Example:**
```typescript
// services/notification-worker/src/consumers/review-consumer.ts
import { Channel, ConsumeMessage } from 'amqplib';
import { Queue } from 'bullmq';
import { db } from '@schedulebox/database';
import { reviews, companies } from '@schedulebox/database/schema';
import { eq } from 'drizzle-orm';
import type { CloudEvent, ReviewCreatedPayload } from '@schedulebox/events';

const QUEUE_NAME = 'notification-worker.review';
const ROUTING_KEY = 'review.created';

export async function setupReviewConsumer(channel: Channel, emailQueue: Queue) {
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  await channel.bindQueue(QUEUE_NAME, 'schedulebox.events', ROUTING_KEY);

  channel.prefetch(10);
  channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const event: CloudEvent<ReviewCreatedPayload> = JSON.parse(msg.content.toString());
      await handleReviewCreated(event, emailQueue);
      channel.ack(msg);
    } catch (error) {
      console.error('[ReviewConsumer] Error:', error);
      channel.nack(msg, false, true);
    }
  });
}

async function handleReviewCreated(
  event: CloudEvent<ReviewCreatedPayload>,
  emailQueue: Queue
) {
  const { reviewUuid, companyId, rating } = event.data;

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.uuid, reviewUuid),
    with: { customer: true, booking: true },
  });

  if (!review || !review.customer) return;

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });

  if (!company) return;

  // Smart routing based on rating
  if (rating >= 4) {
    // HIGH RATING: Route to Google/Facebook review pages
    const googleReviewUrl = company.settings?.googleReviewUrl || null;
    const facebookReviewUrl = company.settings?.facebookReviewUrl || null;

    await emailQueue.add(
      'send-email',
      {
        companyId,
        customerId: review.customer.id,
        recipient: review.customer.email,
        subject: 'Děkujeme za skvělé hodnocení! 🌟',
        html: renderPositiveReviewEmail({
          customerName: review.customer.firstName,
          rating,
          googleReviewUrl,
          facebookReviewUrl,
        }),
        channel: 'email',
      },
      {
        jobId: `review-routing-${event.id}`,
        attempts: 3,
      }
    );
  } else {
    // LOW RATING: Route to internal feedback form
    const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/feedback/${review.uuid}`;

    await emailQueue.add(
      'send-email',
      {
        companyId,
        customerId: review.customer.id,
        recipient: review.customer.email,
        subject: 'Pomozte nám se zlepšit 🙏',
        html: renderNegativeReviewEmail({
          customerName: review.customer.firstName,
          rating,
          feedbackUrl,
        }),
        channel: 'email',
      },
      {
        jobId: `review-routing-${event.id}`,
        attempts: 3,
      }
    );
  }
}

function renderPositiveReviewEmail(data: {
  customerName: string;
  rating: number;
  googleReviewUrl?: string;
  facebookReviewUrl?: string;
}): string {
  return `
    <html>
      <body>
        <h1>Děkujeme, ${data.customerName}! 🌟</h1>
        <p>Jsme rádi, že jste s námi byli spokojeni (${data.rating}/5).</p>
        <p>Pomohli byste nám sdílet vaši zkušenost?</p>
        ${data.googleReviewUrl ? `<a href="${data.googleReviewUrl}">Hodnotit na Google</a><br>` : ''}
        ${data.facebookReviewUrl ? `<a href="${data.facebookReviewUrl}">Hodnotit na Facebooku</a>` : ''}
      </body>
    </html>
  `;
}

function renderNegativeReviewEmail(data: {
  customerName: string;
  rating: number;
  feedbackUrl: string;
}): string {
  return `
    <html>
      <body>
        <h1>Děkujeme za zpětnou vazbu, ${data.customerName}</h1>
        <p>Mrzí nás, že jste nebyli zcela spokojeni (${data.rating}/5).</p>
        <p>Pomozte nám zlepšit naše služby:</p>
        <a href="${data.feedbackUrl}">Sdílet anonymní zpětnou vazbu</a>
      </body>
    </html>
  `;
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML rendering | Custom string concatenation | Handlebars or React Email | Cross-client compatibility (Outlook, Gmail, Apple Mail) is nightmare. Handlebars has proven patterns, React Email provides components. |
| Job scheduling/retry | Custom cron + DB polling | BullMQ | Distributed locking, exponential backoff, job prioritization, failure recovery already solved. Building reliable scheduler is weeks of work. |
| SMTP delivery | Raw Net sockets | Nodemailer | Connection pooling, TLS negotiation, attachment encoding, bounce handling. Nodemailer has 14 years of edge case fixes. |
| Push notification encryption | Manual VAPID/ECDH | web-push library | Web Push Protocol requires ECDH key agreement, AES-GCM encryption, JWT authentication. Library handles spec compliance. |
| Visual workflow editor | Custom canvas library | React Flow | Graph layout algorithms, drag-drop state management, edge routing, zoom/pan. React Flow is production-ready. |
| Template variable extraction | Regex parsing | Handlebars AST | Properly parsing `{{customer_name}}` vs `{{#if}}` requires full parser. Handlebars provides compile-time validation. |

**Key insight:** Notification delivery has 10+ years of edge cases (encoding bugs, rate limiting, retries, idempotency). Use battle-tested libraries that handle the "last 20%" complexity that breaks MVPs.

## Common Pitfalls

### Pitfall 1: Duplicate Notifications from RabbitMQ At-Least-Once Delivery

**What goes wrong:** RabbitMQ guarantees at-least-once delivery. Network failures or consumer crashes can cause same event to be redelivered. Without deduplication, customer receives 2+ confirmation emails for same booking.

**Why it happens:** Consumer ACKs message after processing, but if ACK is lost due to network issue, RabbitMQ redelivers. Default behavior is to process again.

**How to avoid:**
- Use BullMQ `jobId` from CloudEvent `id` for deduplication
- Check if notification already exists in DB before creating (use `onConflictDoNothing`)
- Make consumers idempotent: processing same event twice has same effect as once

**Warning signs:**
- Customers report duplicate emails
- notification_logs table shows multiple entries with same event_id
- BullMQ dashboard shows duplicate jobIds being rejected

### Pitfall 2: Scheduled Notifications Not Accounting for Timezone

**What goes wrong:** Customer books appointment at "14:00" in Prague timezone. System schedules reminder for "24 hours before" in UTC. Reminder arrives at wrong local time.

**Why it happens:** JavaScript Date() uses system timezone. Booking times stored as TIMESTAMPTZ in Postgres (UTC). Delay calculations mix UTC and local time.

**How to avoid:**
- Always store company.timezone from companies table
- Calculate delay in UTC: `booking.startTime - delay` (both in UTC)
- Use `date-fns-tz` for timezone-aware formatting in email content
- Test with companies in different timezones (CZ vs PT vs US)

**Warning signs:**
- Reminders arrive at 2am local time
- "24h before" reminder arrives 25 or 23 hours before (DST transition)
- Customers in different timezones report inconsistent timing

### Pitfall 3: Email Tracking Pixels Blocked by Privacy Tools

**What goes wrong:** Open rate tracking relies on 1x1 pixel image loading when email is opened. Apple Mail Privacy Protection (2021+) prefetches all images, triggering false "opened" events. Gmail caches images, preventing tracking entirely.

**Why it happens:** Email clients evolved to protect user privacy. Apple Mail loads images on server before delivery, Gmail proxies through cache.

**How to avoid:**
- Don't rely on open tracking for critical business logic (it's analytics only)
- Combine with click tracking (more reliable, requires user action)
- Accept that open rate is lower-bound estimate (~40-60% accuracy)
- Use link tracking as primary engagement metric

**Warning signs:**
- 100% open rate for Apple Mail recipients (false positives)
- 0% open rate for Gmail recipients (blocking)
- opened_at timestamp before sent_at (prefetching)

### Pitfall 4: SMS Character Encoding Causing Split Messages

**What goes wrong:** SMS containing emoji or Czech diacritics (ěščřžýáíé) gets split into multiple messages, consuming multiple credits and arriving fragmented.

**Why it happens:** Standard GSM-7 encoding supports 160 chars. Unicode (UCS-2) required for emoji/diacritics only supports 70 chars per message. Twilio auto-splits but charges per segment.

**How to avoid:**
- Use Twilio's `encoding` parameter to detect message segments before sending
- Strip emoji from SMS templates (use plain text: "Diky!" not "Díky! 🎉")
- Limit SMS templates to 70 characters for Czech content
- Show segment count in template editor UI

**Warning signs:**
- SMS costs 2-3x higher than expected
- Customers receive messages split into parts: "Díky za re", "zervaci!"
- Czech characters appear as `?` or `_`

### Pitfall 5: BullMQ Worker Crashes Leaving Jobs Stuck

**What goes wrong:** Worker process crashes mid-job (OOM, unhandled exception, Docker kill). Job remains in "active" state forever, blocking queue processing.

**Why it happens:** BullMQ marks job as "active" when worker picks it up. If worker dies before completing, job isn't moved to "completed" or "failed".

**How to avoid:**
- Set `stalledInterval` and `maxStalledCount` in Worker options
- BullMQ automatically detects stalled jobs and retries them
- Implement graceful shutdown: listen to SIGTERM, finish active jobs before exit
- Use worker health checks in Docker/Kubernetes

**Warning signs:**
- BullMQ dashboard shows jobs stuck in "active" state for hours
- Queue processing stops despite worker running
- Worker restart causes flood of delayed jobs to process

**Example fix:**
```typescript
const worker = new Worker('email-queue', processor, {
  connection: redisConnection,
  settings: {
    stalledInterval: 30000, // Check for stalled jobs every 30s
    maxStalledCount: 3, // Retry stalled job 3 times before failing
  },
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, closing gracefully...');
  await worker.close();
  process.exit(0);
});
```

### Pitfall 6: Automation Rules Creating Infinite Event Loops

**What goes wrong:** Automation rule "When booking.created → send email" triggers email.sent event. Another rule "When email.sent → log analytics" triggers analytics.logged event. Chain reaction causes RabbitMQ queue explosion.

**Why it happens:** Event-driven systems allow circular dependencies. Without loop detection, rules can trigger each other recursively.

**How to avoid:**
- Limit automation rule triggers to domain events only (booking.*, payment.*, customer.*)
- Don't allow rules to trigger on notification.* or automation.* events
- Implement max execution depth (e.g., rule can trigger max 3 downstream rules)
- Add `triggered_by` metadata to CloudEvents for loop detection

**Warning signs:**
- RabbitMQ queue depth grows exponentially
- Same rule executes 100+ times in seconds
- automation_logs table shows circular execution pattern
- Worker CPU pegged at 100%

## Code Examples

Verified patterns from existing codebase and official sources:

### RabbitMQ Consumer Setup (from @schedulebox/events)

```typescript
// Source: D:\Project\ScheduleBox\packages\events\src\publisher.ts
import * as amqp from 'amqplib/callback_api.js';

const EXCHANGE_NAME = 'schedulebox.events';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://schedulebox:schedulebox@localhost:5672';

export async function createConsumer(queueName: string, routingKeys: string[]) {
  return new Promise((resolve, reject) => {
    amqp.connect(RABBITMQ_URL, (err, conn) => {
      if (err) return reject(err);

      conn.createChannel((chErr, channel) => {
        if (chErr) return reject(chErr);

        // Assert topic exchange
        channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        // Assert queue
        channel.assertQueue(queueName, { durable: true }, (qErr, q) => {
          if (qErr) return reject(qErr);

          // Bind queue to routing keys
          routingKeys.forEach((key) => {
            channel.bindQueue(q.queue, EXCHANGE_NAME, key);
          });

          console.log(`[Consumer] Listening on ${queueName}`);
          resolve({ channel, queue: q.queue });
        });
      });
    });
  });
}
```

### Nodemailer SMTP Configuration

```typescript
// Source: Nodemailer official docs
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // 'smtp.sendgrid.net' or custom SMTP
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true, // Connection pooling for performance
  maxConnections: 5,
  maxMessages: 100,
});

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  const info = await transporter.sendMail({
    from: options.from || process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  return info.messageId;
}
```

### Twilio SMS Sending

```typescript
// Source: Twilio Node.js SDK docs
import twilio from 'twilio';

const client = twilio(
  process.env.SMS_ACCOUNT_SID,
  process.env.SMS_AUTH_TOKEN
);

export async function sendSMS(options: {
  to: string;
  body: string;
}) {
  const message = await client.messages.create({
    body: options.body,
    from: process.env.SMS_FROM, // Twilio phone number
    to: options.to,
  });

  return message.sid;
}

// Check message segments before sending
export async function estimateSMSSegments(body: string): Promise<number> {
  // GSM-7: 160 chars per segment
  // UCS-2 (unicode/emoji): 70 chars per segment
  const isUnicode = /[^\x00-\x7F]/.test(body);
  const maxChars = isUnicode ? 70 : 160;
  return Math.ceil(body.length / maxChars);
}
```

### Web Push Notification Setup

```typescript
// Source: web-push library official docs
import webpush from 'web-push';

// Generate VAPID keys once: webpush.generateVAPIDKeys()
webpush.setVapidDetails(
  'mailto:admin@schedulebox.cz',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
  }
) {
  await webpush.sendNotification(
    subscription,
    JSON.stringify(payload)
  );
}
```

### Email Tracking Pixel Endpoint

```typescript
// Source: pxl-for-emails concepts
// apps/web/app/api/webhooks/email-tracking/open/route.ts
import { NextRequest } from 'next/server';
import { db } from '@schedulebox/database';
import { notifications } from '@schedulebox/database/schema';
import { eq, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const nid = request.nextUrl.searchParams.get('nid');

  if (nid) {
    const notificationId = parseInt(nid, 10);

    // Update opened_at only if not already set (first open only)
    await db
      .update(notifications)
      .set({
        status: 'opened',
        openedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          isNull(notifications.openedAt) // Only track first open
        )
      );
  }

  // Return 1x1 transparent PNG
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );

  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| Bull | BullMQ | 2021 | BullMQ is TypeScript rewrite with better performance, separate queue/worker classes, built-in repeatable jobs. Bull is maintenance mode. |
| Sendgrid/Mailgun API | Nodemailer + SMTP or Resend | 2024-2025 | Developer preference shifts to Resend (modern DX, generous free tier) or Nodemailer (self-hosted control). Transactional email APIs remain valid. |
| Template engines in email | React Email / MJML | 2023-2024 | React Email provides type-safe component-based emails. MJML ensures responsive design. Both compile to HTML. Handlebars still valid for simple use cases. |
| Manual cron jobs | BullMQ repeatable jobs | 2020+ | BullMQ handles distributed locking, prevents duplicate cron executions across workers. |
| Separate notification microservice | Monolith workers consuming events | 2024+ | Trend toward "modular monoliths" - separate worker processes but same codebase/database. Simpler than HTTP microservices for small teams. |

**Deprecated/outdated:**
- **Bull (not BullMQ):** Still works but in maintenance mode. BullMQ is recommended for new projects (better TypeScript support, active development).
- **node-cron for scheduled notifications:** Use BullMQ repeatable jobs instead. Better distributed system support.
- **Custom SMTP socket libraries:** Nodemailer has won the email library war. Don't use raw net.Socket.

## Open Questions

1. **Email deliverability optimization**
   - What we know: Nodemailer sends via SMTP, but spam filtering (SPF, DKIM, DMARC) is DNS/infrastructure level
   - What's unclear: Should Phase 7 include SPF/DKIM setup docs, or defer to Phase 9 DevOps?
   - Recommendation: Phase 7 focuses on sending mechanics. DevOps phase handles DNS records, IP warming, deliverability monitoring.

2. **Push notification browser compatibility**
   - What we know: Web Push works in Chrome, Firefox, Edge. Safari requires additional APNs setup.
   - What's unclear: Is Safari push notification support in scope for Phase 7 MVP?
   - Recommendation: Implement Chrome/Firefox first (80% of CZ/SK market). Safari in later phase.

3. **Notification retry limits**
   - What we know: BullMQ supports configurable retry with exponential backoff
   - What's unclear: What's appropriate retry policy for email vs SMS? (Email cheaper, SMS costs per message)
   - Recommendation: Email: 5 retries over 2 hours. SMS: 3 retries over 30 minutes. Move to dead-letter queue after.

4. **Template version control**
   - What we know: Templates stored in notification_templates table
   - What's unclear: Should template changes be versioned? What if admin edits template while 1000 scheduled emails use old version?
   - Recommendation: MVP stores template_id reference. Render template at enqueue time (not send time) to freeze content.

5. **Multi-language template support**
   - What we know: Companies can serve CZ + SK customers. Customer table has locale field.
   - What's unclear: Should Phase 7 support per-locale templates, or use single template with next-intl?
   - Recommendation: MVP uses single template. Multi-locale templates in Phase 8 (i18n enhancement).

## Sources

### Primary (HIGH confidence)

- **Existing codebase:**
  - `D:\Project\ScheduleBox\packages\events\src\publisher.ts` - RabbitMQ publisher implementation with amqplib
  - `D:\Project\ScheduleBox\packages\events\src\events\booking.ts` - CloudEvent schemas for booking lifecycle
  - `D:\Project\ScheduleBox\docker\docker-compose.yml` - RabbitMQ 3.13 already running, Redis 7 available for BullMQ
  - `D:\Project\ScheduleBox\schedulebox_complete_documentation.md` - Lines 1585-1630 (notification tables), 1777-1820 (automation tables), 7563-7575 (SMTP/SMS env vars)

### Secondary (MEDIUM confidence)

- [Nodemailer vs Resend comparison](https://devdiwan.medium.com/goodbye-nodemailer-why-i-switched-to-resend-for-sending-emails-in-node-js-55e5a0dba899) - Developer experience trade-offs
- [Handlebars email templating with Nodemailer](https://medium.com/@alkardorhd/using-handlebars-with-nodemailer-for-professional-email-templating-in-node-js-8b1d7702835a) - Integration patterns
- [BullMQ vs Agenda comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) - Job scheduler features and use cases
- [BullMQ scheduled tasks guide](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/) - Delayed job implementation
- [RabbitMQ with Node.js event-driven architecture](https://raoufcode.medium.com/building-a-reliable-event-driven-architecture-with-rabbitmq-in-node-js-12034d4bbfde) - Consumer patterns
- [Building notification service with RabbitMQ](https://www.suprsend.com/post/building-a-scalable-notification-service-with-node-js-and-rabbitmq) - Scalable architecture
- [React Flow workflow editor](https://reactflow.dev/ui/templates/workflow-editor) - Official template for automation builders
- [Twilio Node.js SMS quickstart](https://www.twilio.com/docs/messaging/quickstart) - Official API documentation
- [Web Push implementation guide](https://medium.com/@salipratham033/implementing-web-push-notifications-in-node-js-30f44d165d8b) - Service Worker + web-push library
- [Email tracking pixels guide](https://hackernoon.com/build-your-own-email-open-tracking-system-using-nodejs) - Implementation patterns
- [MJML responsive email framework](https://mjml.io/) - Official documentation for responsive email HTML

### Tertiary (LOW confidence - needs verification)

- npm-compare charts for library popularity (useful for market trends, not technical validation)
- React Email vs MJML discussions (emerging pattern, not yet industry standard)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries verified from npm registry, existing amqplib integration confirmed in codebase
- Architecture: HIGH - RabbitMQ topology already defined in docs, consumer pattern well-established
- BullMQ integration: MEDIUM - BullMQ recommended but not yet installed, Redis available, integration patterns proven
- Template rendering: HIGH - Handlebars is mature, template schema exists in DB, variable interpolation straightforward
- Visual builder: MEDIUM - React Flow is proven library, but integration with automation_rules schema needs design
- Email/SMS delivery: HIGH - Nodemailer and Twilio are industry standards with official docs
- Push notifications: MEDIUM - Web Push spec is standard, but Safari APNs adds complexity
- Pitfalls: HIGH - Based on documented issues in existing event-driven systems and BullMQ best practices

**Research date:** 2026-02-11
**Valid until:** 2026-03-13 (30 days - notification patterns are stable, library ecosystems mature)

**What might be missing:**
- Production SMTP relay configuration (Sendgrid vs Postmark vs self-hosted)
- Email template A/B testing requirements
- Notification preference center UI (unsubscribe management)
- Real-time delivery status webhooks (Twilio delivery receipts, SMTP bounce handling)
- Automation rule conflict detection (two rules triggering same action)
- Multi-tenant notification rate limiting (prevent one company from monopolizing workers)
- Notification analytics dashboard (open rates, click rates, conversion tracking)
