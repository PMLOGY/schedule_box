/**
 * Payment Detail Endpoint
 * GET /api/v1/payments/{id} - Get single payment with full details
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, payments, bookings, customers, invoices, services } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError } from '@schedulebox/shared';
import { z } from 'zod';

/**
 * Validation schema for payment ID path parameter
 */
const paymentIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/v1/payments/{id}
 * Get payment detail with related booking, customer, and invoice information
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.PAYMENTS_VIEW],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Extract and validate payment UUID from path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const paymentIdStr = pathParts[pathParts.length - 1];

    const parseResult = paymentIdParamSchema.safeParse({ id: paymentIdStr });
    if (!parseResult.success) {
      throw new NotFoundError('Invalid payment ID format');
    }

    const paymentUuid = parseResult.data.id;

    // Query payment with related entities (JOIN booking, service, customer, invoice)
    const [paymentData] = await db
      .select({
        // Payment fields
        id: payments.id,
        uuid: payments.uuid,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        gatewayResponse: payments.gatewayResponse,
        refundAmount: payments.refundAmount,
        refundReason: payments.refundReason,
        paidAt: payments.paidAt,
        refundedAt: payments.refundedAt,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        // Booking fields
        bookingUuid: bookings.uuid,
        bookingStatus: bookings.status,
        bookingStartTime: bookings.startTime,
        bookingEndTime: bookings.endTime,
        // Service name (from services table join)
        serviceName: services.name,
        // Customer fields
        customerUuid: customers.uuid,
        customerName: customers.name,
        customerEmail: customers.email,
        // Invoice fields (LEFT JOIN since invoice might not exist yet)
        invoiceUuid: invoices.uuid,
        invoiceNumber: invoices.invoiceNumber,
        invoiceStatus: invoices.status,
      })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(customers, eq(payments.customerId, customers.id))
      .leftJoin(invoices, eq(payments.id, invoices.paymentId))
      .where(
        and(
          eq(payments.uuid, paymentUuid),
          eq(payments.companyId, companyId),
          isNull(payments.deletedAt),
        ),
      )
      .limit(1);

    // Return 404 if payment not found or doesn't belong to company
    if (!paymentData) {
      throw new NotFoundError('Payment not found');
    }

    // Return full payment detail with related entities
    return successResponse({
      id: paymentData.uuid,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: paymentData.status,
      gateway: paymentData.gateway,
      gateway_transaction_id: paymentData.gatewayTransactionId,
      gateway_response: paymentData.gatewayResponse, // Include for admin debugging
      refund_amount: paymentData.refundAmount,
      refund_reason: paymentData.refundReason,
      paid_at: paymentData.paidAt,
      refunded_at: paymentData.refundedAt,
      created_at: paymentData.createdAt,
      updated_at: paymentData.updatedAt,
      // Related booking info
      booking: {
        id: paymentData.bookingUuid,
        status: paymentData.bookingStatus,
        start_time: paymentData.bookingStartTime,
        end_time: paymentData.bookingEndTime,
        service_name: paymentData.serviceName,
      },
      // Related customer info
      customer: {
        id: paymentData.customerUuid,
        name: paymentData.customerName,
        email: paymentData.customerEmail,
      },
      // Related invoice info (if exists)
      invoice: paymentData.invoiceUuid
        ? {
            id: paymentData.invoiceUuid,
            invoice_number: paymentData.invoiceNumber,
            status: paymentData.invoiceStatus,
          }
        : null,
    });
  },
});
