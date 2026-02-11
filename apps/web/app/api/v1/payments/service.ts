/**
 * Payment Service Layer
 * Business logic for payment operations, status transitions, and idempotency
 */

import { eq, and, sql } from 'drizzle-orm';
import {
  db,
  payments,
  bookings,
  invoices,
  processedWebhooks,
  type Database,
} from '@schedulebox/database';
import { NotFoundError, ValidationError } from '@schedulebox/shared';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Parameters for creating a new payment record
 */
export interface CreatePaymentParams {
  companyId: number;
  bookingId: number;
  customerId: number;
  amount: string;
  currency: string;
  gateway: 'comgate' | 'qrcomat' | 'cash' | 'bank_transfer' | 'gift_card';
  gatewayTransactionId?: string;
}

/**
 * Optional fields for updating payment status
 */
export interface UpdatePaymentExtras {
  paidAt?: Date;
  refundAmount?: string;
  refundReason?: string;
  refundedAt?: Date;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, unknown>;
}

/**
 * Status transition validation map
 * Defines which status transitions are allowed
 */
const VALID_STATUS_TRANSITIONS: Record<
  string,
  Array<'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded'>
> = {
  pending: ['paid', 'failed'],
  paid: ['refunded', 'partially_refunded'],
  failed: [],
  refunded: [],
  partially_refunded: ['refunded'],
};

// ============================================================================
// CREATE PAYMENT RECORD
// ============================================================================

/**
 * Create a new payment record in the database
 *
 * Validates:
 * - Booking exists and belongs to the company
 *
 * @throws NotFoundError if booking not found or doesn't belong to company
 */
export async function createPaymentRecord(params: CreatePaymentParams) {
  const { companyId, bookingId, customerId, amount, currency, gateway, gatewayTransactionId } =
    params;

  // Validate booking exists and belongs to company
  const [booking] = await db
    .select({ id: bookings.id, companyId: bookings.companyId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking || booking.companyId !== companyId) {
    throw new NotFoundError('Booking not found');
  }

  // Insert payment record
  const [payment] = await db
    .insert(payments)
    .values({
      companyId,
      bookingId,
      customerId,
      amount,
      currency,
      gateway,
      gatewayTransactionId,
      status: 'pending',
    })
    .returning();

  return payment;
}

// ============================================================================
// UPDATE PAYMENT STATUS
// ============================================================================

/**
 * Update payment status with validation and locking
 *
 * Uses SELECT FOR UPDATE to prevent race conditions on status transitions.
 * Validates status transitions are valid (pending->paid, paid->refunded, etc).
 *
 * @throws NotFoundError if payment not found
 * @throws ValidationError if status transition is invalid
 */
export async function updatePaymentStatus(
  paymentId: number,
  newStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded',
  extras?: UpdatePaymentExtras,
) {
  return await db.transaction(async (tx) => {
    // Lock payment row with SELECT FOR UPDATE
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .for('update')
      .limit(1);

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Validate status transition
    const currentStatus = payment.status as string;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Build update values
    const updateValues: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (extras?.paidAt) updateValues.paidAt = extras.paidAt;
    if (extras?.refundAmount) updateValues.refundAmount = extras.refundAmount;
    if (extras?.refundReason) updateValues.refundReason = extras.refundReason;
    if (extras?.refundedAt) updateValues.refundedAt = extras.refundedAt;
    if (extras?.gatewayTransactionId)
      updateValues.gatewayTransactionId = extras.gatewayTransactionId;
    if (extras?.gatewayResponse) updateValues.gatewayResponse = extras.gatewayResponse;

    // Update payment
    const [updatedPayment] = await tx
      .update(payments)
      .set(updateValues)
      .where(eq(payments.id, paymentId))
      .returning();

    return updatedPayment;
  });
}

// ============================================================================
// GENERATE INVOICE NUMBER
// ============================================================================

/**
 * Generate sequential invoice number for a company
 *
 * Format: YYYY-NNNN (e.g., 2026-0001, 2026-0002)
 * Sequence resets each year.
 *
 * MUST be called within a transaction to prevent race conditions.
 * Uses SELECT MAX(invoice_number) within transaction for atomicity.
 *
 * @param companyId - Company ID for invoice numbering
 * @param tx - Drizzle transaction instance (required for atomicity)
 * @returns Next invoice number in format YYYY-NNNN
 */
export async function generateInvoiceNumber(companyId: number, tx: Database): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `${currentYear}-`;

  // Get max invoice number for current year within transaction
  const [result] = await tx
    .select({
      maxNumber: sql<string | null>`MAX(${invoices.invoiceNumber})`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.companyId, companyId),
        sql`${invoices.invoiceNumber} LIKE ${yearPrefix + '%'}`,
      ),
    );

  // Extract sequence number from max invoice number
  let nextSequence = 1;
  if (result.maxNumber) {
    const parts = result.maxNumber.split('-');
    if (parts.length === 2) {
      const currentSequence = parseInt(parts[1], 10);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
  }

  // Format with zero-padding (4 digits)
  const sequenceStr = nextSequence.toString().padStart(4, '0');
  return `${currentYear}-${sequenceStr}`;
}

// ============================================================================
// FIND PAYMENT BY GATEWAY TRANSACTION
// ============================================================================

/**
 * Lookup payment by gateway and transaction ID
 *
 * Uses the idx_payments_gateway_tx composite index for efficient lookup.
 *
 * @returns Payment record or null if not found
 */
export async function findPaymentByGatewayTx(
  gateway: 'comgate' | 'qrcomat' | 'cash' | 'bank_transfer' | 'gift_card',
  gatewayTransactionId: string,
) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(eq(payments.gateway, gateway), eq(payments.gatewayTransactionId, gatewayTransactionId)),
    )
    .limit(1);

  return payment || null;
}

// ============================================================================
// WEBHOOK IDEMPOTENCY
// ============================================================================

/**
 * Check if webhook event has already been processed (idempotency check)
 *
 * Attempts to insert webhook event record. If event_id already exists (23505 unique_violation),
 * returns alreadyProcessed: true.
 *
 * This leverages the PRIMARY KEY constraint on event_id for atomic idempotency.
 *
 * @param eventId - Gateway's unique event/transaction ID
 * @param gatewayName - Payment gateway name (comgate | qrcomat)
 * @param payload - Raw webhook payload for debugging
 * @returns Object with alreadyProcessed flag
 */
export async function checkWebhookIdempotency(
  eventId: string,
  gatewayName: 'comgate' | 'qrcomat',
  payload: Record<string, unknown>,
): Promise<{ alreadyProcessed: boolean }> {
  try {
    // Try to insert webhook processing record
    await db.insert(processedWebhooks).values({
      eventId,
      gatewayName,
      status: 'processing',
      payload,
    });

    // If insert succeeds, this is the first time we're processing this event
    return { alreadyProcessed: false };
  } catch (error: unknown) {
    // Check if error is unique constraint violation (23505)
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '23505') {
        // Event ID already exists - webhook already processed
        return { alreadyProcessed: true };
      }
    }

    // Re-throw other errors
    throw error;
  }
}

// ============================================================================
// MARK WEBHOOK COMPLETED
// ============================================================================

/**
 * Mark webhook processing as completed
 *
 * Updates processed_webhooks record to 'completed' status with completion timestamp.
 *
 * @param eventId - Gateway's unique event/transaction ID
 */
export async function markWebhookCompleted(eventId: string): Promise<void> {
  await db
    .update(processedWebhooks)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(processedWebhooks.eventId, eventId));
}
