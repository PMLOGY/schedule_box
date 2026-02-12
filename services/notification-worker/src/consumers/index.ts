/**
 * Consumer Orchestrator
 * Starts all RabbitMQ event consumers for notification worker
 */

import type { Channel } from 'amqplib';
import type { Queue } from 'bullmq';
import { setupBookingConsumer } from './booking-consumer.js';
import { setupPaymentConsumer } from './payment-consumer.js';
import { setupReviewConsumer } from './review-consumer.js';
import { setupReviewRatingSyncConsumer } from './review-rating-sync.js';

/**
 * BullMQ queues interface
 */
interface Queues {
  emailQueue: Queue;
  smsQueue: Queue;
  pushQueue: Queue;
}

/**
 * Start all RabbitMQ consumers
 * @param channel RabbitMQ channel
 * @param queues BullMQ queue instances for enqueuing jobs
 */
export async function startConsumers(channel: Channel, queues: Queues): Promise<void> {
  console.log('[Consumer Orchestrator] Starting all consumers...');

  // Start booking consumer (handles booking.created, booking.completed, booking.cancelled)
  await setupBookingConsumer(channel, queues);

  // Start payment consumer (handles payment.completed, payment.failed)
  await setupPaymentConsumer(channel, queues);

  // Start review consumer (handles review.created with smart routing)
  await setupReviewConsumer(channel, queues);

  // Start review rating sync consumer (handles review.created for marketplace rating updates)
  await setupReviewRatingSyncConsumer(channel);

  console.log('[Consumer Orchestrator] All consumers started successfully');
}
