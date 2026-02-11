/**
 * Comgate Webhook Endpoint
 * POST /api/v1/webhooks/comgate - Receive payment status updates from Comgate
 *
 * PUBLIC ENDPOINT - No auth (called by Comgate servers)
 * Signature verification for security
 * Idempotency handling to prevent duplicate processing
 */

import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import {
  findPaymentByGatewayTx,
  updatePaymentStatus,
  checkWebhookIdempotency,
  markWebhookCompleted,
} from '@/app/api/v1/payments/service';
import { verifyComgateSignature } from '@/app/api/v1/payments/comgate/client';
import { publishEvent } from '@schedulebox/events';
import { createPaymentCompletedEvent, createPaymentFailedEvent } from '@schedulebox/events';
import {
  handlePaymentCompleted,
  handlePaymentFailed,
} from '@/app/api/v1/payments/saga/booking-payment-handlers';

/**
 * POST /api/v1/webhooks/comgate
 * Process Comgate webhook notifications
 *
 * Comgate sends application/x-www-form-urlencoded data with:
 * - transId: Transaction ID
 * - status: Payment status (PAID, CANCELLED, AUTHORIZED)
 * - price: Amount in hellers
 * - ... other fields
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body BEFORE parsing (required for signature verification)
    const rawBody = await req.text();

    // 2. Get signature from header
    // Note: Comgate signature header format needs to be verified in Comgate docs
    // Common patterns: x-comgate-signature, x-signature, signature
    const signature = req.headers.get('x-signature') || req.headers.get('signature') || '';

    // 3. Verify signature
    if (!signature || !verifyComgateSignature(rawBody, signature)) {
      console.error('Comgate webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 4. Parse body (application/x-www-form-urlencoded)
    const parsedBody = new URLSearchParams(rawBody);
    const transId = parsedBody.get('transId');
    const status = parsedBody.get('status');

    if (!transId || !status) {
      console.error('Comgate webhook missing required fields', { transId, status });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 5. Convert parsed body to plain object for storage
    const payload: Record<string, unknown> = {};
    parsedBody.forEach((value, key) => {
      payload[key] = value;
    });

    // 6. Idempotency check
    const { alreadyProcessed } = await checkWebhookIdempotency(transId, 'comgate', payload);

    if (alreadyProcessed) {
      console.log(`Comgate webhook ${transId} already processed, ignoring duplicate`);
      return NextResponse.json({ message: 'Already processed' }, { status: 200 });
    }

    // 7. Find payment by gateway transaction ID
    const payment = await findPaymentByGatewayTx('comgate', transId);

    if (!payment) {
      // Log warning but return 200 (Comgate might send webhook before our payment record exists)
      console.warn(`Payment not found for Comgate transaction ${transId}`);
      await markWebhookCompleted(transId);
      return NextResponse.json({ message: 'Payment not found' }, { status: 200 });
    }

    // 8. Find booking (needed for events)
    const [booking] = await db
      .select({ uuid: bookings.uuid })
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1);

    if (!booking) {
      console.error(`Booking not found for payment ${payment.uuid}`);
      await markWebhookCompleted(transId);
      return NextResponse.json({ message: 'Booking not found' }, { status: 200 });
    }

    // 9. Process based on Comgate status
    if (status === 'PAID') {
      // Payment successful
      await updatePaymentStatus(payment.id, 'paid', {
        paidAt: new Date(),
        gatewayResponse: payload,
      });

      // Prepare event data
      const completedEventData = {
        paymentUuid: payment.uuid,
        bookingUuid: booking.uuid,
        companyId: payment.companyId,
        amount: payment.amount,
        currency: payment.currency || 'CZK',
        gateway: 'comgate',
        completedAt: new Date().toISOString(),
      };

      // Publish payment.completed event
      try {
        await publishEvent(createPaymentCompletedEvent(completedEventData));
      } catch (error) {
        console.error('Failed to publish payment.completed event:', error);
      }

      // Execute SAGA handler synchronously (MVP - no RabbitMQ consumer yet)
      try {
        await handlePaymentCompleted(completedEventData);
      } catch (error) {
        console.error('Failed to execute SAGA handler for payment.completed:', error);
      }
    } else if (status === 'CANCELLED') {
      // Payment cancelled by customer
      await updatePaymentStatus(payment.id, 'failed', {
        gatewayResponse: payload,
      });

      // Prepare event data
      const failedEventData = {
        paymentUuid: payment.uuid,
        bookingUuid: booking.uuid,
        companyId: payment.companyId,
        gateway: 'comgate',
        reason: 'Payment cancelled by customer',
        failedAt: new Date().toISOString(),
      };

      // Publish payment.failed event
      try {
        await publishEvent(createPaymentFailedEvent(failedEventData));
      } catch (error) {
        console.error('Failed to publish payment.failed event:', error);
      }

      // Execute SAGA handler synchronously (MVP - no RabbitMQ consumer yet)
      try {
        await handlePaymentFailed(failedEventData);
      } catch (error) {
        console.error('Failed to execute SAGA handler for payment.failed:', error);
      }
    } else if (status === 'AUTHORIZED') {
      // Payment authorized but not captured - treat as pending
      console.log(`Payment ${payment.uuid} authorized but not captured (status: AUTHORIZED)`);
      // No status update needed, payment remains pending
    } else {
      // Unknown status - log but don't fail
      console.warn(`Unknown Comgate status '${status}' for transaction ${transId}`);
    }

    // 10. Mark webhook as completed
    await markWebhookCompleted(transId);

    // 11. Return 200 immediately (Comgate expects response within 5 seconds)
    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (error) {
    // Log error but return 200 to prevent Comgate retry loops
    console.error('Error processing Comgate webhook:', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 200 });
  }
}
