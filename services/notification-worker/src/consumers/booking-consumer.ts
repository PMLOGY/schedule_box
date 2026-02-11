/**
 * Booking Event Consumer
 * Listens to booking lifecycle events and enqueues notifications
 */

import type { Channel, ConsumeMessage } from 'amqplib';
import type { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import type {
  BookingCreatedEvent,
  BookingCompletedEvent,
  BookingCancelledEvent,
} from '@schedulebox/events';
import { renderTemplate, renderTemplateFile } from '../services/template-renderer.js';
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
 * TODO: Push subscriptions need to be stored in a separate table or in customer metadata field
 * Currently commented out as users table doesn't have metadata field
 */
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Get customer's push subscription from user metadata
 * TODO: Implement push subscription storage and retrieval
 */
async function getCustomerPushSubscription(_customerId: number): Promise<PushSubscription | null> {
  // Placeholder - push subscription storage not yet implemented
  // Need to add metadata JSONB field to customers or users table, or create push_subscriptions table
  return null;
}

/**
 * Handle booking.created event - send confirmation notifications
 */
async function handleBookingCreated(event: BookingCreatedEvent, queues: Queues): Promise<void> {
  const { bookingUuid, companyId } = event.data;

  // Fetch booking with relations
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.uuid, bookingUuid),
    with: {
      customer: true,
      service: true,
      employee: true,
    },
  });

  if (!booking || !booking.customer?.email) {
    console.warn(
      `[Booking Consumer] Booking ${bookingUuid} not found or customer has no email, skipping notification`,
    );
    return;
  }

  const customerName = booking.customer.name;
  const serviceName = booking.service?.name || 'Služba';
  const employeeName = booking.employee ? booking.employee.name : 'náš tým';
  const companyName = 'ScheduleBox'; // TODO: fetch from company settings
  const cancelUrl = `${config.appUrl}/bookings/${bookingUuid}/cancel`;

  // Prepare template data
  const templateData = {
    customer_name: customerName,
    service_name: serviceName,
    booking_date: booking.startTime,
    booking_time: booking.startTime,
    employee_name: employeeName,
    price: booking.price,
    currency: booking.currency,
    company_name: companyName,
    cancel_url: cancelUrl,
  };

  // Check for custom template in database
  const dbTemplate = await db.query.notificationTemplates.findFirst({
    where: (templates, { eq, and }) =>
      and(
        eq(templates.companyId, companyId),
        eq(templates.type, 'booking_confirmation'),
        eq(templates.channel, 'email'),
        eq(templates.isActive, true),
      ),
  });

  let subject: string;
  let html: string;

  if (dbTemplate) {
    // Use database template
    subject = renderTemplate(dbTemplate.subject || 'Potvrzení rezervace', templateData);
    html = renderTemplate(dbTemplate.bodyTemplate, templateData);
  } else {
    // Use default file template
    subject = renderTemplate('Potvrzení rezervace - {{service_name}}', templateData);
    html = renderTemplateFile('booking-confirmation', 'email', templateData);
  }

  // Enqueue email with idempotent jobId
  await queues.emailQueue.add(
    'send-email',
    {
      companyId,
      customerId: booking.customer.id,
      recipient: booking.customer.email,
      subject,
      html,
    },
    {
      jobId: `confirm-${event.id}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  );

  console.log(
    `[Booking Consumer] Enqueued confirmation email for booking ${bookingUuid}, jobId: confirm-${event.id}`,
  );

  // Check for SMS template and customer phone
  if (booking.customer.phone) {
    const smsTemplate = await db.query.notificationTemplates.findFirst({
      where: (templates, { eq, and }) =>
        and(
          eq(templates.companyId, companyId),
          eq(templates.type, 'booking_confirmation'),
          eq(templates.channel, 'sms'),
          eq(templates.isActive, true),
        ),
    });

    if (smsTemplate) {
      const smsBody = renderTemplate(smsTemplate.bodyTemplate, templateData);

      await queues.smsQueue.add(
        'send-sms',
        {
          companyId,
          customerId: booking.customer.id,
          recipient: booking.customer.phone,
          body: smsBody,
        },
        {
          jobId: `confirm-sms-${event.id}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      console.log(
        `[Booking Consumer] Enqueued confirmation SMS for booking ${bookingUuid}, jobId: confirm-sms-${event.id}`,
      );
    }
  }

  // Check for push subscription
  const pushSubscription = await getCustomerPushSubscription(booking.customer.id);
  if (pushSubscription) {
    const bookingDate = new Date(booking.startTime);
    const formattedDate = bookingDate.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    await queues.pushQueue.add(
      'send-push',
      {
        companyId,
        customerId: booking.customer.id,
        subscription: pushSubscription,
        title: 'Rezervace potvrzena',
        body: `${serviceName} - ${formattedDate}`,
        url: `${config.appUrl}/bookings/${bookingUuid}`,
      },
      {
        jobId: `confirm-push-${event.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    console.log(
      `[Booking Consumer] Enqueued confirmation push for booking ${bookingUuid}, jobId: confirm-push-${event.id}`,
    );
  }
}

/**
 * Handle booking.completed event - send review request after delay
 */
async function handleBookingCompleted(event: BookingCompletedEvent, queues: Queues): Promise<void> {
  const { bookingUuid, companyId } = event.data;

  // Fetch booking with relations
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.uuid, bookingUuid),
    with: {
      customer: true,
      service: true,
    },
  });

  if (!booking || !booking.customer?.email) {
    console.warn(
      `[Booking Consumer] Booking ${bookingUuid} not found or customer has no email, skipping review request`,
    );
    return;
  }

  const customerName = booking.customer.name;
  const serviceName = booking.service?.name || 'Služba';
  const reviewUrl = `${config.appUrl}/reviews/submit/${bookingUuid}`;

  // Prepare template data
  const templateData = {
    customer_name: customerName,
    service_name: serviceName,
    review_url: reviewUrl,
  };

  // Check for review request template in database
  const dbTemplate = await db.query.notificationTemplates.findFirst({
    where: (templates, { eq, and }) =>
      and(
        eq(templates.companyId, companyId),
        eq(templates.type, 'review_request'),
        eq(templates.channel, 'email'),
        eq(templates.isActive, true),
      ),
  });

  let subject: string;
  let html: string;

  if (dbTemplate) {
    subject = renderTemplate(dbTemplate.subject || 'Ohodnoťte naši službu', templateData);
    html = renderTemplate(dbTemplate.bodyTemplate, templateData);
  } else {
    subject = renderTemplate('Jak se vám líbila služba {{service_name}}?', templateData);
    html = renderTemplateFile('review-request', 'email', templateData);
  }

  // Enqueue with 2-hour delay
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  await queues.emailQueue.add(
    'send-email',
    {
      companyId,
      customerId: booking.customer.id,
      recipient: booking.customer.email,
      subject,
      html,
    },
    {
      jobId: `review-request-${event.id}`,
      delay: TWO_HOURS_MS,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  );

  console.log(
    `[Booking Consumer] Enqueued review request email for booking ${bookingUuid} with 2h delay, jobId: review-request-${event.id}`,
  );
}

/**
 * Handle booking.cancelled event - send cancellation notification
 */
async function handleBookingCancelled(event: BookingCancelledEvent, queues: Queues): Promise<void> {
  const { bookingUuid, companyId, cancelledBy, reason } = event.data;

  // Fetch booking with relations
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.uuid, bookingUuid),
    with: {
      customer: true,
      service: true,
    },
  });

  if (!booking || !booking.customer?.email) {
    console.warn(
      `[Booking Consumer] Booking ${bookingUuid} not found or customer has no email, skipping cancellation notification`,
    );
    return;
  }

  const customerName = booking.customer.name;
  const serviceName = booking.service?.name || 'Služba';
  const bookingDate = new Date(booking.startTime);

  // Prepare template data
  const templateData = {
    customer_name: customerName,
    service_name: serviceName,
    booking_date: booking.startTime,
    cancelled_by: cancelledBy,
    reason: reason || 'Nebyl uveden důvod',
  };

  // Check for cancellation template in database
  const dbTemplate = await db.query.notificationTemplates.findFirst({
    where: (templates, { eq, and }) =>
      and(
        eq(templates.companyId, companyId),
        eq(templates.type, 'booking_cancellation'),
        eq(templates.channel, 'email'),
        eq(templates.isActive, true),
      ),
  });

  let subject: string;
  let html: string;

  if (dbTemplate) {
    subject = renderTemplate(dbTemplate.subject || 'Rezervace zrušena', templateData);
    html = renderTemplate(dbTemplate.bodyTemplate, templateData);
  } else {
    subject = 'Rezervace zrušena';
    // Use booking-confirmation template as fallback (should create cancellation template)
    html = `<p>Dobrý den ${customerName},</p><p>Vaše rezervace služby ${serviceName} byla zrušena.</p><p>Důvod: ${reason || 'Nebyl uveden'}</p>`;
  }

  // Enqueue email
  await queues.emailQueue.add(
    'send-email',
    {
      companyId,
      customerId: booking.customer.id,
      recipient: booking.customer.email,
      subject,
      html,
    },
    {
      jobId: `cancel-${event.id}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  );

  console.log(
    `[Booking Consumer] Enqueued cancellation email for booking ${bookingUuid}, jobId: cancel-${event.id}`,
  );

  // Check for push subscription
  const pushSubscription = await getCustomerPushSubscription(booking.customer.id);
  if (pushSubscription) {
    await queues.pushQueue.add(
      'send-push',
      {
        companyId,
        customerId: booking.customer.id,
        subscription: pushSubscription,
        title: 'Rezervace zrušena',
        body: `${serviceName} - ${bookingDate.toLocaleDateString('cs-CZ')}`,
        url: `${config.appUrl}/bookings/${bookingUuid}`,
      },
      {
        jobId: `cancel-push-${event.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    console.log(
      `[Booking Consumer] Enqueued cancellation push for booking ${bookingUuid}, jobId: cancel-push-${event.id}`,
    );
  }
}

/**
 * Setup booking event consumer
 */
export async function setupBookingConsumer(channel: Channel, queues: Queues): Promise<void> {
  const queueName = 'notification-worker.booking';

  // Assert durable queue
  await channel.assertQueue(queueName, { durable: true });

  // Bind to routing keys
  const routingKeys = [
    'booking.created',
    'booking.confirmed',
    'booking.completed',
    'booking.cancelled',
    'booking.rescheduled',
  ];

  for (const routingKey of routingKeys) {
    await channel.bindQueue(queueName, 'schedulebox.events', routingKey);
  }

  // Set prefetch
  channel.prefetch(10);

  // Consume messages
  await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as
        | BookingCreatedEvent
        | BookingCompletedEvent
        | BookingCancelledEvent;

      console.log(`[Booking Consumer] Received event: ${event.type}`);

      // Route to appropriate handler
      if (event.type === 'com.schedulebox.booking.created') {
        await handleBookingCreated(event as BookingCreatedEvent, queues);
      } else if (event.type === 'com.schedulebox.booking.completed') {
        await handleBookingCompleted(event as BookingCompletedEvent, queues);
      } else if (event.type === 'com.schedulebox.booking.cancelled') {
        await handleBookingCancelled(event as BookingCancelledEvent, queues);
      } else {
        console.log(`[Booking Consumer] Unhandled event type: ${event.type}`);
      }

      // ACK message on success
      channel.ack(msg);
    } catch (error) {
      console.error('[Booking Consumer] Error processing message:', error);
      // NACK and requeue on error
      channel.nack(msg, false, true);
    }
  });

  console.log(`[Booking Consumer] Started - listening to ${routingKeys.join(', ')}`);
}
