/**
 * Booking Expiration Service
 * Marks pending bookings as expired after 30 minutes
 *
 * Simple cron-based approach for MVP:
 * - External cron or scheduler calls expiration endpoint
 * - Query marks all pending bookings older than 30 minutes as expired
 * - Publishes domain events for each expired booking
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import { publishEvent, createBookingCancelledEvent } from '@schedulebox/events';

/**
 * Expire pending bookings older than 30 minutes
 *
 * Execution flow:
 * 1. Update all pending bookings created > 30 minutes ago to 'expired' status
 * 2. Publish booking.cancelled event for each expired booking (cancelledBy='system')
 *
 * @returns Count of expired bookings
 */
export async function expirePendingBookings(): Promise<number> {
  // Execute UPDATE with RETURNING to get expired booking details
  const expiredBookings = await db
    .update(bookings)
    .set({
      status: 'cancelled', // Use 'cancelled' status with system flag instead of separate 'expired' status
      cancelledAt: new Date(),
      cancelledBy: 'system',
      cancellationReason: 'Booking expired (unpaid after 30 minutes)',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(bookings.status, 'pending'),
        sql`${bookings.createdAt} < NOW() - INTERVAL '30 minutes'`,
      ),
    )
    .returning({
      id: bookings.id,
      uuid: bookings.uuid,
      companyId: bookings.companyId,
    });

  const count = expiredBookings.length;

  // Log expiration event
  console.log(`[INFO] Expired ${count} pending bookings`);

  // Publish booking.cancelled event for each expired booking
  for (const booking of expiredBookings) {
    try {
      await publishEvent(
        createBookingCancelledEvent({
          bookingUuid: booking.uuid,
          companyId: booking.companyId,
          cancelledBy: 'system',
          reason: 'Booking expired (unpaid after 30 minutes)',
          cancelledAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      // Event publishing is fire-and-forget in MVP
      console.error(
        `[Booking Expiration] Failed to publish event for booking ${booking.uuid}:`,
        error,
      );
    }
  }

  return count;
}
