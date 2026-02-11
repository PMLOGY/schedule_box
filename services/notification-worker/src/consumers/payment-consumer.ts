/**
 * Payment Event Consumer
 * Listens to payment lifecycle events and enqueues notifications
 */

import type { Channel, Message } from 'amqplib';
import type { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db, payments } from '@schedulebox/database';
import type { CloudEvent } from '@schedulebox/events';
import { renderTemplate } from '../services/template-renderer.js';
import { config } from '../config.js';

/**
 * BullMQ queues interface
 */
interface Queues {
  emailQueue: Queue;
  smsQueue: Queue;
  pushQueue: Queue;
}

/**
 * Push subscription type (from user metadata)
 */
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Payment completed event payload
 */
interface PaymentCompletedPayload {
  paymentUuid: string;
  companyId: number;
  bookingId: number;
  amount: string;
  currency: string;
  gateway: string;
  completedAt: string;
}

/**
 * Payment failed event payload
 */
interface PaymentFailedPayload {
  paymentUuid: string;
  companyId: number;
  bookingId: number;
  gateway: string;
  errorMessage: string;
  failedAt: string;
}

type PaymentCompletedEvent = CloudEvent<PaymentCompletedPayload>;
type PaymentFailedEvent = CloudEvent<PaymentFailedPayload>;

/**
 * Get customer's push subscription from user metadata
 * TODO: Implement push subscription storage and retrieval
 */
async function getCustomerPushSubscription(_customerId: number): Promise<PushSubscription | null> {
  // Placeholder - push subscription storage not yet implemented
  return null;
}

/**
 * Handle payment.completed event - send payment confirmation
 */
async function handlePaymentCompleted(event: PaymentCompletedEvent, queues: Queues): Promise<void> {
  const { paymentUuid, companyId, amount, currency, gateway } = event.data;

  // Fetch payment with relations
  const payment = await db.query.payments.findFirst({
    where: eq(payments.uuid, paymentUuid),
    with: {
      booking: {
        with: {
          customer: true,
          service: true,
        },
      },
    },
  });

  if (!payment || !payment.booking?.customer?.email) {
    console.warn(
      `[Payment Consumer] Payment ${paymentUuid} not found or customer has no email, skipping notification`,
    );
    return;
  }

  const customer = payment.booking.customer;
  const customerName = customer.name;
  const serviceName = payment.booking.service?.name || 'Služba';

  // Prepare template data
  const templateData = {
    customer_name: customerName,
    service_name: serviceName,
    amount,
    currency,
    gateway,
    payment_date: event.data.completedAt,
  };

  // Check for payment confirmation template in database
  const dbTemplate = await db.query.notificationTemplates.findFirst({
    where: (templates, { eq, and }) =>
      and(
        eq(templates.companyId, companyId),
        eq(templates.type, 'payment_confirmation'),
        eq(templates.channel, 'email'),
        eq(templates.isActive, true),
      ),
  });

  let subject: string;
  let html: string;

  if (dbTemplate) {
    subject = renderTemplate(dbTemplate.subject || 'Platba přijata', templateData);
    html = renderTemplate(dbTemplate.bodyTemplate, templateData);
  } else {
    subject = 'Platba úspěšně přijata';
    html = `<p>Dobrý den ${customerName},</p><p>Vaše platba za službu ${serviceName} byla úspěšně přijata.</p><p>Částka: ${amount} ${currency}</p><p>Způsob platby: ${gateway}</p>`;
  }

  // Enqueue email
  await queues.emailQueue.add(
    'send-email',
    {
      companyId,
      customerId: customer.id,
      recipient: customer.email,
      subject,
      html,
    },
    {
      jobId: `payment-confirm-${event.id}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  );

  console.log(
    `[Payment Consumer] Enqueued payment confirmation email for payment ${paymentUuid}, jobId: payment-confirm-${event.id}`,
  );

  // Check for push subscription
  const pushSubscription = await getCustomerPushSubscription(customer.id);
  if (pushSubscription) {
    await queues.pushQueue.add(
      'send-push',
      {
        companyId,
        customerId: customer.id,
        subscription: pushSubscription,
        title: 'Platba přijata',
        body: `${amount} ${currency} - ${serviceName}`,
        url: `${config.appUrl}/bookings/${payment.booking.uuid}`,
      },
      {
        jobId: `payment-confirm-push-${event.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    console.log(
      `[Payment Consumer] Enqueued payment confirmation push for payment ${paymentUuid}, jobId: payment-confirm-push-${event.id}`,
    );
  }
}

/**
 * Handle payment.failed event - send payment failure notification
 */
async function handlePaymentFailed(event: PaymentFailedEvent, queues: Queues): Promise<void> {
  const { paymentUuid, companyId, gateway, errorMessage } = event.data;

  // Fetch payment with relations
  const payment = await db.query.payments.findFirst({
    where: eq(payments.uuid, paymentUuid),
    with: {
      booking: {
        with: {
          customer: true,
          service: true,
        },
      },
    },
  });

  if (!payment || !payment.booking?.customer?.email) {
    console.warn(
      `[Payment Consumer] Payment ${paymentUuid} not found or customer has no email, skipping notification`,
    );
    return;
  }

  const customer = payment.booking.customer;
  const customerName = customer.name;
  const serviceName = payment.booking.service?.name || 'Služba';

  // Prepare template data
  const templateData = {
    customer_name: customerName,
    service_name: serviceName,
    gateway,
    error_message: errorMessage,
    retry_url: `${config.appUrl}/bookings/${payment.booking.uuid}/pay`,
  };

  // Check for payment failure template in database
  const dbTemplate = await db.query.notificationTemplates.findFirst({
    where: (templates, { eq, and }) =>
      and(
        eq(templates.companyId, companyId),
        eq(templates.type, 'payment_confirmation'), // Use payment_confirmation as fallback
        eq(templates.channel, 'email'),
        eq(templates.isActive, true),
      ),
  });

  let subject: string;
  let html: string;

  if (dbTemplate) {
    subject = renderTemplate(dbTemplate.subject || 'Platba se nezdařila', templateData);
    html = renderTemplate(dbTemplate.bodyTemplate, templateData);
  } else {
    subject = 'Platba se nezdařila';
    html = `<p>Dobrý den ${customerName},</p><p>Vaše platba za službu ${serviceName} se bohužel nezdařila.</p><p>Důvod: ${errorMessage}</p><p>Můžete zkusit platbu opakovat.</p>`;
  }

  // Enqueue email
  await queues.emailQueue.add(
    'send-email',
    {
      companyId,
      customerId: customer.id,
      recipient: customer.email,
      subject,
      html,
    },
    {
      jobId: `payment-failed-${event.id}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  );

  console.log(
    `[Payment Consumer] Enqueued payment failure email for payment ${paymentUuid}, jobId: payment-failed-${event.id}`,
  );

  // Check for push subscription
  const pushSubscription = await getCustomerPushSubscription(customer.id);
  if (pushSubscription) {
    await queues.pushQueue.add(
      'send-push',
      {
        companyId,
        customerId: customer.id,
        subscription: pushSubscription,
        title: 'Platba se nezdařila',
        body: `${serviceName} - ${errorMessage}`,
        url: `${config.appUrl}/bookings/${payment.booking.uuid}/pay`,
      },
      {
        jobId: `payment-failed-push-${event.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    console.log(
      `[Payment Consumer] Enqueued payment failure push for payment ${paymentUuid}, jobId: payment-failed-push-${event.id}`,
    );
  }
}

/**
 * Setup payment event consumer
 */
export async function setupPaymentConsumer(channel: Channel, queues: Queues): Promise<void> {
  const queueName = 'notification-worker.payment';

  // Assert durable queue
  await channel.assertQueue(queueName, { durable: true });

  // Bind to routing keys
  const routingKeys = ['payment.completed', 'payment.failed'];

  for (const routingKey of routingKeys) {
    await channel.bindQueue(queueName, 'schedulebox.events', routingKey);
  }

  // Set prefetch
  channel.prefetch(10);

  // Consume messages
  await channel.consume(queueName, async (msg: Message | null) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as
        | PaymentCompletedEvent
        | PaymentFailedEvent;

      console.log(`[Payment Consumer] Received event: ${event.type}`);

      // Route to appropriate handler
      if (event.type === 'com.schedulebox.payment.completed') {
        await handlePaymentCompleted(event as PaymentCompletedEvent, queues);
      } else if (event.type === 'com.schedulebox.payment.failed') {
        await handlePaymentFailed(event as PaymentFailedEvent, queues);
      } else {
        console.log(`[Payment Consumer] Unhandled event type: ${event.type}`);
      }

      // ACK message on success
      channel.ack(msg);
    } catch (error) {
      console.error('[Payment Consumer] Error processing message:', error);
      // NACK and requeue on error
      channel.nack(msg, false, true);
    }
  });

  console.log(`[Payment Consumer] Started - listening to ${routingKeys.join(', ')}`);
}
