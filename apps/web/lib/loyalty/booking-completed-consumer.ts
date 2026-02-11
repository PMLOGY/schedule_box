/**
 * Booking Completed Event Consumer for Loyalty Points
 *
 * RabbitMQ consumer that listens for booking.completed events and automatically
 * awards loyalty points via the points engine. Fulfills LOYAL-03 (automatic points earning).
 *
 * Features:
 * - Idempotent: awardPointsForBooking checks for existing transactions before awarding
 * - Graceful shutdown: SIGTERM closes channel and connection cleanly
 * - Standalone or embedded: Can run as a worker process or be started within Next.js server
 *
 * Exports:
 * - handleBookingCompleted: Event handler (exported for testing)
 * - startBookingCompletedConsumer: Starts the consumer loop
 */

import type { CloudEvent } from '@schedulebox/events';
import type { BookingCompletedPayload } from '@schedulebox/events';
import { createConsumerConnection, consumeMessages, gracefulShutdown } from '@schedulebox/events';
import { awardPointsForBooking } from './points-engine';

// ============================================================================
// EVENT HANDLER
// ============================================================================

/**
 * Handle a booking.completed CloudEvent
 *
 * Extracts bookingUuid and companyId from the event payload, then calls
 * awardPointsForBooking which handles:
 * - Looking up the booking
 * - Idempotency check (skips if points already awarded)
 * - Looking up or auto-creating the loyalty card
 * - Calculating and awarding points
 * - Tier upgrade check
 *
 * If awardPointsForBooking succeeds (including the idempotent skip case),
 * the message is ACKed. If it throws, the consumer NACKs and requeues.
 *
 * @param event - CloudEvent with BookingCompletedPayload
 */
export async function handleBookingCompleted(
  event: CloudEvent<BookingCompletedPayload>,
): Promise<void> {
  const { bookingUuid, companyId } = event.data;

  console.log(
    `[Loyalty Consumer] Processing booking.completed event for booking ${bookingUuid} (company ${companyId})`,
  );

  try {
    await awardPointsForBooking(bookingUuid, companyId);
    console.log(`[Loyalty Consumer] Awarded points for booking ${bookingUuid}`);
  } catch (error) {
    console.error(`[Loyalty Consumer] Failed to award points for booking ${bookingUuid}:`, error);
    // Re-throw so consumer NACKs and requeues the message
    throw error;
  }
}

// ============================================================================
// CONSUMER STARTUP
// ============================================================================

/**
 * Start the booking.completed event consumer
 *
 * Creates a RabbitMQ connection, binds to the booking.completed routing key,
 * and starts consuming messages with the handleBookingCompleted handler.
 *
 * Sets up SIGTERM handler for graceful shutdown (close channel, then connection).
 *
 * Can be called from:
 * - A standalone worker process (e.g., services/loyalty-worker/index.ts)
 * - The Next.js server during development (e.g., in instrumentation.ts)
 */
export async function startBookingCompletedConsumer(): Promise<void> {
  const { connection, channel } = await createConsumerConnection();

  // Bind to booking.completed events on the loyalty queue
  await consumeMessages(channel, {
    queueName: 'loyalty.booking-completed',
    routingKeys: ['booking.completed'],
    prefetch: 10,
    handler: handleBookingCompleted,
  });

  console.log('[Loyalty Worker] Listening for booking.completed events...');

  // Graceful shutdown on SIGTERM
  const shutdown = async () => {
    console.log('[Loyalty Worker] Shutting down...');
    await gracefulShutdown(connection, channel);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
