/**
 * SAGA Choreography Event Handlers
 * Booking-Payment Flow Compensation Logic
 *
 * For MVP: These handlers are called DIRECTLY from webhook handlers and timeout functions.
 * When Phase 7 adds RabbitMQ consumers, these become the consumer callbacks with zero code changes.
 */

import { eq } from 'drizzle-orm';
import { dbTx, bookings } from '@schedulebox/database';
import { publishEvent } from '@schedulebox/events';
import { createBookingConfirmedEvent, createBookingCancelledEvent } from '@schedulebox/events';
import type {
  PaymentCompletedPayload,
  PaymentFailedPayload,
  PaymentExpiredPayload,
} from '@schedulebox/events';

/**
 * Handle payment.completed event
 * SAGA Happy Path: Successful payment confirms the booking
 *
 * Idempotent: Safe to call multiple times for same payment
 */
export async function handlePaymentCompleted(data: PaymentCompletedPayload): Promise<void> {
  console.log(`[SAGA] Processing payment.completed for booking ${data.bookingUuid}`);

  try {
    // Use transaction with SELECT FOR UPDATE to prevent race conditions
    await dbTx.transaction(async (tx) => {
      // Lock the booking row
      const [booking] = await tx
        .select({
          id: bookings.id,
          uuid: bookings.uuid,
          status: bookings.status,
          companyId: bookings.companyId,
        })
        .from(bookings)
        .where(eq(bookings.uuid, data.bookingUuid))
        .for('update')
        .limit(1);

      if (!booking) {
        console.error(`[SAGA] Booking ${data.bookingUuid} not found`);
        return;
      }

      // Idempotent check: If already confirmed, skip
      if (booking.status === 'confirmed') {
        console.log(`[SAGA] Booking ${data.bookingUuid} already confirmed, skipping`);
        return;
      }

      // Edge case: Booking already cancelled (late payment after timeout)
      if (booking.status === 'cancelled') {
        console.warn(
          `[SAGA] Booking ${data.bookingUuid} already cancelled, payment received late. Manual reconciliation needed.`,
        );
        return;
      }

      // Verify booking is in pending state
      if (booking.status !== 'pending') {
        console.warn(
          `[SAGA] Booking ${data.bookingUuid} in unexpected status '${booking.status}', expected 'pending'`,
        );
        return;
      }

      // Update booking status to confirmed
      await tx
        .update(bookings)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id));

      console.log(`[SAGA] Booking ${data.bookingUuid} confirmed after payment ${data.paymentUuid}`);

      // Publish booking.confirmed event
      try {
        await publishEvent(
          createBookingConfirmedEvent({
            bookingUuid: booking.uuid,
            companyId: booking.companyId,
            confirmedAt: new Date().toISOString(),
          }),
        );
      } catch (error) {
        console.error('[SAGA] Failed to publish booking.confirmed event:', error);
        // Don't fail the transaction - event publishing is fire-and-forget for MVP
      }
    });
  } catch (error) {
    console.error('[SAGA] Error handling payment.completed:', error);
    throw error;
  }
}

/**
 * Handle payment.failed event
 * SAGA Compensation: Failed payment cancels the booking
 *
 * Idempotent: Safe to call multiple times for same payment
 */
export async function handlePaymentFailed(data: PaymentFailedPayload): Promise<void> {
  console.log(`[SAGA] Processing payment.failed for booking ${data.bookingUuid}`);

  try {
    // Use transaction with SELECT FOR UPDATE to prevent race conditions
    await dbTx.transaction(async (tx) => {
      // Lock the booking row
      const [booking] = await tx
        .select({
          id: bookings.id,
          uuid: bookings.uuid,
          status: bookings.status,
          companyId: bookings.companyId,
        })
        .from(bookings)
        .where(eq(bookings.uuid, data.bookingUuid))
        .for('update')
        .limit(1);

      if (!booking) {
        console.error(`[SAGA] Booking ${data.bookingUuid} not found`);
        return;
      }

      // Idempotent check: If already cancelled, skip
      if (booking.status === 'cancelled') {
        console.log(`[SAGA] Booking ${data.bookingUuid} already cancelled, skipping`);
        return;
      }

      // Edge case: Booking already confirmed (payment succeeded elsewhere, race condition)
      if (booking.status === 'confirmed') {
        console.warn(
          `[SAGA] Booking ${data.bookingUuid} already confirmed, ignoring payment failure (race condition)`,
        );
        return;
      }

      // Verify booking is in pending state
      if (booking.status !== 'pending') {
        console.warn(
          `[SAGA] Booking ${data.bookingUuid} in unexpected status '${booking.status}', expected 'pending'`,
        );
        return;
      }

      // Update booking: cancel with system actor
      await tx
        .update(bookings)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: 'system',
          cancellationReason: data.reason,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id));

      console.log(`[SAGA] Booking ${data.bookingUuid} cancelled — payment failed: ${data.reason}`);

      // Publish booking.cancelled event
      try {
        await publishEvent(
          createBookingCancelledEvent({
            bookingUuid: booking.uuid,
            companyId: booking.companyId,
            cancelledBy: 'system',
            reason: data.reason,
            cancelledAt: new Date().toISOString(),
          }),
        );
      } catch (error) {
        console.error('[SAGA] Failed to publish booking.cancelled event:', error);
        // Don't fail the transaction - event publishing is fire-and-forget for MVP
      }
    });
  } catch (error) {
    console.error('[SAGA] Error handling payment.failed:', error);
    throw error;
  }
}

/**
 * Handle payment.expired event
 * SAGA Timeout Compensation: Expired payment cancels the booking
 *
 * Idempotent: Safe to call multiple times for same payment
 */
export async function handlePaymentExpired(data: PaymentExpiredPayload): Promise<void> {
  console.log(`[SAGA] Processing payment.expired for booking ${data.bookingUuid}`);

  try {
    // Use transaction with SELECT FOR UPDATE to prevent race conditions
    await dbTx.transaction(async (tx) => {
      // Lock the booking row
      const [booking] = await tx
        .select({
          id: bookings.id,
          uuid: bookings.uuid,
          status: bookings.status,
          companyId: bookings.companyId,
        })
        .from(bookings)
        .where(eq(bookings.uuid, data.bookingUuid))
        .for('update')
        .limit(1);

      if (!booking) {
        console.error(`[SAGA] Booking ${data.bookingUuid} not found`);
        return;
      }

      // Idempotent check: If already cancelled, skip
      if (booking.status === 'cancelled') {
        console.log(`[SAGA] Booking ${data.bookingUuid} already cancelled, skipping`);
        return;
      }

      // Edge case: Booking already confirmed (payment completed just before timeout)
      if (booking.status === 'confirmed') {
        console.warn(
          `[SAGA] Booking ${data.bookingUuid} already confirmed, ignoring expiration (late race condition)`,
        );
        return;
      }

      // Verify booking is in pending state
      if (booking.status !== 'pending') {
        console.warn(
          `[SAGA] Booking ${data.bookingUuid} in unexpected status '${booking.status}', expected 'pending'`,
        );
        return;
      }

      // Update booking: cancel with system actor and timeout reason
      await tx
        .update(bookings)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: 'system',
          cancellationReason: 'Payment timeout (30 minutes)',
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id));

      console.log(`[SAGA] Booking ${data.bookingUuid} cancelled — payment expired`);

      // Publish booking.cancelled event
      try {
        await publishEvent(
          createBookingCancelledEvent({
            bookingUuid: booking.uuid,
            companyId: booking.companyId,
            cancelledBy: 'system',
            reason: 'Payment timeout (30 minutes)',
            cancelledAt: new Date().toISOString(),
          }),
        );
      } catch (error) {
        console.error('[SAGA] Failed to publish booking.cancelled event:', error);
        // Don't fail the transaction - event publishing is fire-and-forget for MVP
      }
    });
  } catch (error) {
    console.error('[SAGA] Error handling payment.expired:', error);
    throw error;
  }
}
