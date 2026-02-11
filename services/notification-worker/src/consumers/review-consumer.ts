/**
 * Review Event Consumer
 * Listens to review.created events and implements smart routing
 */

import type { Channel, Message } from 'amqplib/callback_api.js';
import type { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db, reviews, companies } from '@schedulebox/database';
import type { CloudEvent } from '@schedulebox/events';
import { renderTemplate } from '../services/template-renderer.js';
import { config } from '../config.js';

/**
 * BullMQ queues interface
 */
interface Queues {
  emailQueue: Queue;
  pushQueue: Queue;
}

/**
 * Review created event payload
 */
interface ReviewCreatedPayload {
  reviewUuid: string;
  companyId: number;
  customerId: number;
  bookingId: number;
  rating: number;
  createdAt: string;
}

type ReviewCreatedEvent = CloudEvent<ReviewCreatedPayload>;

/**
 * Push subscription type
 * TODO: Implement push subscription storage and retrieval
 */
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Get customer's push subscription
 * TODO: Implement push subscription storage and retrieval
 */
async function getCustomerPushSubscription(_customerId: number): Promise<PushSubscription | null> {
  // Placeholder - push subscription storage not yet implemented
  return null;
}

/**
 * Handle review.created event - smart routing based on rating
 */
async function handleReviewCreated(event: ReviewCreatedEvent, queues: Queues): Promise<void> {
  const { reviewUuid, companyId, rating } = event.data;

  // Fetch review with customer relation
  const review = await db.query.reviews.findFirst({
    where: eq(reviews.uuid, reviewUuid),
    with: {
      customer: true,
    },
  });

  if (!review || !review.customer?.email) {
    console.warn(
      `[Review Consumer] Review ${reviewUuid} not found or customer has no email, skipping notification`,
    );
    return;
  }

  // Fetch company settings for review URLs
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { settings: true },
  });

  const settings =
    (company?.settings as { googleReviewUrl?: string; facebookReviewUrl?: string }) || {};
  const customerName = review.customer.name;

  // Smart routing based on rating
  if (rating >= 4) {
    // Positive review (4-5 stars) - route to external platforms
    const googleUrl = settings.googleReviewUrl;
    const facebookUrl = settings.facebookReviewUrl;

    // Update review redirectedTo field
    if (googleUrl || facebookUrl) {
      await db
        .update(reviews)
        .set({ redirectedTo: googleUrl ? 'google' : 'facebook' })
        .where(eq(reviews.uuid, reviewUuid));
    }

    // Prepare template data
    const templateData = {
      customer_name: customerName,
      rating,
      google_review_url: googleUrl,
      facebook_review_url: facebookUrl,
      has_google: !!googleUrl,
      has_facebook: !!facebookUrl,
    };

    // Check for custom template in database
    const dbTemplate = await db.query.notificationTemplates.findFirst({
      where: (templates, { eq: eqOp, and }) =>
        and(
          eqOp(templates.companyId, companyId),
          eqOp(templates.type, 'review_request'), // Use review_request template for routing
          eqOp(templates.channel, 'email'),
          eqOp(templates.isActive, true),
        ),
    });

    let subject: string;
    let html: string;

    if (dbTemplate) {
      subject = renderTemplate(dbTemplate.subject || 'Děkujeme za hodnocení!', templateData);
      html = renderTemplate(dbTemplate.bodyTemplate, templateData);
    } else {
      // Default positive review email
      subject = 'Děkujeme za skvělé hodnocení!';
      html = `
        <p>Dobrý den ${customerName},</p>
        <p>Děkujeme za vaše skvělé hodnocení ${rating}/5 hvězdiček! ⭐</p>
        ${googleUrl ? `<p><a href="${googleUrl}" style="display: inline-block; background: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Hodnotit na Google</a></p>` : ''}
        ${facebookUrl ? `<p><a href="${facebookUrl}" style="display: inline-block; background: #1877F2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Hodnotit na Facebooku</a></p>` : ''}
        <p>Velmi si vážíme vašeho času a zpětné vazby.</p>
      `;
    }

    // Enqueue email
    await queues.emailQueue.add(
      'send-email',
      {
        companyId,
        customerId: review.customer.id,
        recipient: review.customer.email,
        subject,
        html,
      },
      {
        jobId: `review-route-${event.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    console.log(
      `[Review Consumer] Enqueued positive review routing email for review ${reviewUuid}, jobId: review-route-${event.id}`,
    );

    // Check for push subscription
    const pushSubscription = await getCustomerPushSubscription(review.customer.id);
    if (pushSubscription) {
      await queues.pushQueue.add(
        'send-push',
        {
          companyId,
          customerId: review.customer.id,
          subscription: pushSubscription,
          title: 'Děkujeme za hodnocení!',
          body: `Vaše hodnocení ${rating}/5 hvězdiček nám velmi pomohlo!`,
          url: googleUrl || facebookUrl || config.appUrl,
        },
        {
          jobId: `review-route-push-${event.id}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      console.log(
        `[Review Consumer] Enqueued positive review push for review ${reviewUuid}, jobId: review-route-push-${event.id}`,
      );
    }
  } else {
    // Negative review (1-3 stars) - route to internal feedback
    const feedbackUrl = `${config.appUrl}/feedback/${reviewUuid}`;

    // Update review redirectedTo field
    await db.update(reviews).set({ redirectedTo: 'internal' }).where(eq(reviews.uuid, reviewUuid));

    // Prepare template data
    const templateData = {
      customer_name: customerName,
      rating,
      feedback_url: feedbackUrl,
    };

    // Check for custom template in database
    const dbTemplate = await db.query.notificationTemplates.findFirst({
      where: (templates, { eq: eqOp, and }) =>
        and(
          eqOp(templates.companyId, companyId),
          eqOp(templates.type, 'follow_up'), // Use follow_up template for internal feedback
          eqOp(templates.channel, 'email'),
          eqOp(templates.isActive, true),
        ),
    });

    let subject: string;
    let html: string;

    if (dbTemplate) {
      subject = renderTemplate(dbTemplate.subject || 'Pomožte nám zlepšit', templateData);
      html = renderTemplate(dbTemplate.bodyTemplate, templateData);
    } else {
      // Default negative review email
      subject = 'Děkujeme za zpětnou vazbu';
      html = `
        <p>Dobrý den ${customerName},</p>
        <p>Děkujeme za vaši zpětnou vazbu. Mrzí nás, že vaše zkušenost nebyla ideální.</p>
        <p>Rádi bychom se dozvěděli více o tom, jak bychom mohli zlepšit naše služby.</p>
        <p><a href="${feedbackUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Sdílet zpětnou vazbu</a></p>
        <p>Děkujeme za váš čas.</p>
      `;
    }

    // Enqueue email
    await queues.emailQueue.add(
      'send-email',
      {
        companyId,
        customerId: review.customer.id,
        recipient: review.customer.email,
        subject,
        html,
      },
      {
        jobId: `review-route-${event.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    console.log(
      `[Review Consumer] Enqueued negative review feedback email for review ${reviewUuid}, jobId: review-route-${event.id}`,
    );

    // Check for push subscription
    const pushSubscription = await getCustomerPushSubscription(review.customer.id);
    if (pushSubscription) {
      await queues.pushQueue.add(
        'send-push',
        {
          companyId,
          customerId: review.customer.id,
          subscription: pushSubscription,
          title: 'Děkujeme za zpětnou vazbu',
          body: 'Rádi bychom se dozvěděli více o vaší zkušenosti',
          url: feedbackUrl,
        },
        {
          jobId: `review-route-push-${event.id}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      console.log(
        `[Review Consumer] Enqueued negative review push for review ${reviewUuid}, jobId: review-route-push-${event.id}`,
      );
    }
  }
}

/**
 * Setup review event consumer
 */
export async function setupReviewConsumer(channel: Channel, queues: Queues): Promise<void> {
  const queueName = 'notification-worker.review';

  // Assert durable queue
  await channel.assertQueue(queueName, { durable: true });

  // Bind to routing key
  const routingKey = 'review.created';
  await channel.bindQueue(queueName, 'schedulebox.events', routingKey);

  // Set prefetch
  channel.prefetch(10);

  // Consume messages
  await channel.consume(queueName, async (msg: Message | null) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as ReviewCreatedEvent;

      console.log(`[Review Consumer] Received event: ${event.type}`);

      // Route to handler
      if (event.type === 'com.schedulebox.review.created') {
        await handleReviewCreated(event, queues);
      } else {
        console.log(`[Review Consumer] Unhandled event type: ${event.type}`);
      }

      // ACK message on success
      channel.ack(msg);
    } catch (error) {
      console.error('[Review Consumer] Error processing message:', error);
      // NACK and requeue on error
      channel.nack(msg, false, true);
    }
  });

  console.log(`[Review Consumer] Started - listening to ${routingKey}`);
}
