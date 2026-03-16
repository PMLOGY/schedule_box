/**
 * Booking Completed Event Handler for Loyalty Points
 *
 * RabbitMQ consumer removed for Vercel serverless deployment.
 * handleBookingCompleted is called directly from the booking completion API route.
 * Fulfills LOYAL-03 (automatic points earning).
 *
 * Features:
 * - Idempotent: awardPointsForBooking checks for existing transactions before awarding
 *
 * Exports:
 * - handleBookingCompleted: Event handler (exported for testing and direct invocation)
 */

import type { CloudEvent } from '@schedulebox/events';
import type { BookingCompletedPayload } from '@schedulebox/events';
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
 * @param event - CloudEvent with BookingCompletedPayload
 */
export async function handleBookingCompleted(
  event: CloudEvent<BookingCompletedPayload>,
): Promise<void> {
  const { bookingUuid, companyId } = event.data;

  console.log(
    `[Loyalty] Processing booking.completed event for booking ${bookingUuid} (company ${companyId})`,
  );

  try {
    await awardPointsForBooking(bookingUuid, companyId);
    console.log(`[Loyalty] Awarded points for booking ${bookingUuid}`);
  } catch (error) {
    console.error(`[Loyalty] Failed to award points for booking ${bookingUuid}:`, error);
    throw error;
  }
}

/**
 * No-op consumer startup — RabbitMQ removed for Vercel serverless deployment.
 * Kept for backward compatibility with any imports.
 */
export async function startBookingCompletedConsumer(): Promise<void> {
  console.log('[Loyalty] Consumer disabled — using direct invocation on Vercel.');
}
