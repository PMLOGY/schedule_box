/**
 * Payment Refund Endpoint
 *
 * POST /api/v1/payments/{id}/refund
 * Process full or partial refund for a completed payment
 *
 * For Comgate: calls external API
 * For cash/bank_transfer/gift_card: records refund locally (manual reconciliation)
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { db, payments, bookings } from '@schedulebox/database';
import { NotFoundError, ValidationError, AppError } from '@schedulebox/shared';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { updatePaymentStatus } from '../../service';
import { refundComgatePayment } from '../../comgate/client';
import { publishEvent, createPaymentRefundedEvent } from '@schedulebox/events';
import { successResponse } from '@/lib/utils/response';

// ============================================================================
// SCHEMAS
// ============================================================================

// Path params schema
const paymentIdParamSchema = z.object({
  id: z.string().uuid(),
});

type PaymentIdParam = z.infer<typeof paymentIdParamSchema>;

// Request body schema
const paymentRefundSchema = z.object({
  amount: z.number().positive().optional(), // Optional for partial refund
  reason: z.string().min(1, 'Reason is required'),
});

type PaymentRefundBody = z.infer<typeof paymentRefundSchema>;

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/v1/payments/{id}/refund
 * Process payment refund (full or partial)
 *
 * Access: Admin/Owner only
 *
 * @returns Updated payment record with refund details
 * @throws 404 if payment not found
 * @throws 400 if payment not refundable (status, amount)
 */
export const POST = createRouteHandler<PaymentRefundBody, PaymentIdParam>({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.PAYMENTS_REFUND], // Admin/owner only
  paramsSchema: paymentIdParamSchema,
  bodySchema: paymentRefundSchema,
  handler: async ({ params, body, user }) => {
    // Get company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Extract payment UUID from path params
    const paymentUuid = params.id;
    const { amount: refundAmountRequested, reason } = body;

    // Find payment by UUID
    const [payment] = await db
      .select({
        id: payments.id,
        uuid: payments.uuid,
        companyId: payments.companyId,
        bookingId: payments.bookingId,
        amount: payments.amount,
        refundAmount: payments.refundAmount,
        status: payments.status,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        currency: payments.currency,
      })
      .from(payments)
      .where(eq(payments.uuid, paymentUuid))
      .limit(1);

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Verify tenant isolation
    if (payment.companyId !== companyId) {
      throw new NotFoundError('Payment not found');
    }

    // Validate payment is refundable
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      throw new ValidationError('Payment must be paid or partially refunded to process refund');
    }

    // Calculate refund amount
    const totalAmount = parseFloat(payment.amount);
    const alreadyRefunded = parseFloat(payment.refundAmount || '0');
    const remainingAmount = totalAmount - alreadyRefunded;

    // Determine refund amount (partial or full)
    const thisRefundAmount = refundAmountRequested ?? remainingAmount;

    // Validate refund amount doesn't exceed remaining
    if (thisRefundAmount > remainingAmount) {
      throw new ValidationError(
        `Refund amount (${thisRefundAmount}) exceeds remaining amount (${remainingAmount})`,
      );
    }

    if (thisRefundAmount <= 0) {
      throw new ValidationError('Refund amount must be positive');
    }

    // Calculate new totals
    const newRefundTotal = alreadyRefunded + thisRefundAmount;
    const newStatus = newRefundTotal >= totalAmount ? 'refunded' : 'partially_refunded';

    // Process refund based on gateway
    let gatewayResponse: Record<string, unknown> = {};

    if (payment.gateway === 'comgate') {
      // Comgate refund requires gateway transaction ID
      if (!payment.gatewayTransactionId) {
        throw new AppError(
          'PAYMENT_REFUND_FAILED',
          'Cannot refund Comgate payment without transaction ID',
          400,
        );
      }

      try {
        // Call Comgate API (amount in hellers for partial refund, undefined for full refund)
        const refundAmountHellers =
          refundAmountRequested !== undefined ? Math.round(thisRefundAmount * 100) : undefined;
        const result = await refundComgatePayment(
          payment.gatewayTransactionId,
          refundAmountHellers,
        );

        gatewayResponse = result;
      } catch {
        // Comgate API error
        throw new AppError('PAYMENT_REFUND_FAILED', 'Comgate refund API call failed', 500);
      }
    }
    // For cash/bank_transfer/gift_card/qrcomat: no external API call needed (manual reconciliation)

    // Update payment record with refund details
    // updatePaymentStatus handles transaction and SELECT FOR UPDATE internally
    await updatePaymentStatus(payment.id, newStatus as 'refunded' | 'partially_refunded', {
      refundAmount: newRefundTotal.toString(),
      refundReason: reason,
      refundedAt: new Date(),
      gatewayResponse:
        payment.gateway === 'comgate'
          ? {
              ...((payment.gatewayTransactionId as unknown as Record<string, unknown>) || {}),
              refund: gatewayResponse,
            }
          : undefined,
    });

    // Fetch booking for event
    const [booking] = await db
      .select({ uuid: bookings.uuid })
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1);

    const bookingUuid = booking?.uuid ?? '';

    // Publish payment refunded event (fire-and-forget)
    try {
      await publishEvent(
        createPaymentRefundedEvent({
          paymentUuid: payment.uuid,
          bookingUuid,
          companyId,
          amount: thisRefundAmount.toString(),
          currency: payment.currency || 'CZK',
          refundedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error('Failed to publish payment refunded event:', error);
      // Don't fail the request - event publishing is non-critical for MVP
    }

    // Return updated payment (UUID-safe fields only, no SERIAL IDs)
    const [updatedPayment] = await db
      .select({
        id: payments.uuid,
        uuid: payments.uuid,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        refundAmount: payments.refundAmount,
        refundReason: payments.refundReason,
        paidAt: payments.paidAt,
        refundedAt: payments.refundedAt,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .where(eq(payments.id, payment.id))
      .limit(1);

    return successResponse(updatedPayment);
  },
});
