/**
 * Payment Timeout and Expiration Logic
 * Expires abandoned pending payments after 30 minutes
 *
 * For MVP: Triggered manually or by external cron job
 * For Production (Phase 15): Integrated with scheduled job infrastructure (node-cron, Kubernetes CronJob)
 */

import { sql, eq } from 'drizzle-orm';
import { db, payments } from '@schedulebox/database';
import { publishEvent } from '@schedulebox/events';
import { createPaymentExpiredEvent } from '@schedulebox/events';
import { handlePaymentExpired } from './booking-payment-handlers';

/**
 * Expire pending payments older than timeout threshold
 *
 * @param timeoutMinutes - Timeout in minutes (default: 30, or from PAYMENT_TIMEOUT_MINUTES env var)
 * @returns Count of expired payments
 */
export async function expirePendingPayments(timeoutMinutes?: number): Promise<number> {
  // Get timeout from parameter, env var, or default to 30 minutes
  const timeout = timeoutMinutes ?? parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '30', 10);

  console.log(`[Payment Timeout] Checking for pending payments older than ${timeout} minutes`);

  try {
    // Calculate cutoff timestamp (NOW - timeout minutes)
    const cutoffTime = new Date(Date.now() - timeout * 60 * 1000);

    // Query: SELECT * FROM payments WHERE status = 'pending' AND created_at < cutoff
    const expiredPayments = await db
      .select({
        id: payments.id,
        uuid: payments.uuid,
        bookingId: payments.bookingId,
        companyId: payments.companyId,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(sql`${payments.status} = 'pending' AND ${payments.createdAt} < ${cutoffTime}`);

    if (expiredPayments.length === 0) {
      console.log('[Payment Timeout] No expired payments found');
      return 0;
    }

    console.log(`[Payment Timeout] Found ${expiredPayments.length} expired pending payments`);

    let successCount = 0;

    // Process each expired payment
    for (const payment of expiredPayments) {
      try {
        // Fetch booking UUID for event
        const [booking] = await db
          .select({ uuid: sql<string>`uuid` })
          .from(sql`bookings`)
          .where(sql`id = ${payment.bookingId}`)
          .limit(1);

        if (!booking) {
          console.warn(`[Payment Timeout] Booking not found for payment ${payment.uuid}`);
          continue;
        }

        // Update payment status to 'failed' with timeout indicator
        // Note: 'expired' is not in payments.status CHECK constraint,
        // so we use 'failed' with gatewayResponse noting timeout
        await db
          .update(payments)
          .set({
            status: 'failed',
            gatewayResponse: {
              reason: 'payment_timeout',
              expiredAt: new Date().toISOString(),
              timeoutMinutes: timeout,
            },
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        // Prepare event data
        const expiredEventData = {
          paymentUuid: payment.uuid,
          bookingUuid: booking.uuid,
          companyId: payment.companyId,
          reason: 'payment_timeout' as const,
        };

        // Publish payment.expired event
        try {
          await publishEvent(createPaymentExpiredEvent(expiredEventData));
        } catch (error) {
          console.error(
            `[Payment Timeout] Failed to publish payment.expired event for ${payment.uuid}:`,
            error,
          );
        }

        // Execute SAGA handler (cancel booking)
        try {
          await handlePaymentExpired(expiredEventData);
        } catch (error) {
          console.error(
            `[Payment Timeout] Failed to execute SAGA handler for ${payment.uuid}:`,
            error,
          );
        }

        successCount++;
        console.log(`[Payment Timeout] Expired payment ${payment.uuid}`);
      } catch (error) {
        console.error(`[Payment Timeout] Error processing payment ${payment.uuid}:`, error);
        // Continue with next payment
      }
    }

    console.log(
      `[Payment Timeout] Expired ${successCount}/${expiredPayments.length} pending payments older than ${timeout} minutes`,
    );

    return successCount;
  } catch (error) {
    console.error('[Payment Timeout] Error expiring pending payments:', error);
    throw error;
  }
}

/**
 * Payment timeout result for API response
 */
export interface PaymentTimeoutResult {
  expired_count: number;
  payments: Array<{ payment_uuid: string; booking_uuid: string }>;
}
