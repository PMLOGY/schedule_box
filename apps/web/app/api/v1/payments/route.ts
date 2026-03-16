/**
 * Payment List and Manual Create Endpoints
 * GET  /api/v1/payments - List payments with pagination, search, and filters
 * POST /api/v1/payments - Create manual payment record (cash, bank_transfer)
 */

import { eq, and, isNull, gte, lte, desc, sql } from 'drizzle-orm';
import { db, payments, bookings, customers, services } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { createdResponse, paginatedResponse } from '@/lib/utils/response';
import { publishEvent } from '@schedulebox/events';
import { createPaymentCompletedEvent } from '@schedulebox/events';
import {
  paymentCreateSchema,
  paymentListQuerySchema,
  type PaymentCreate,
  type PaymentListQuery,
} from '@schedulebox/shared';
import {
  createPaymentRecord,
  updatePaymentStatus,
  type UpdatePaymentExtras,
} from '@/app/api/v1/payments/service';
import { handlePaymentCompleted } from '@/app/api/v1/payments/saga/booking-payment-handlers';
import { createInvoiceForPayment } from '@/app/api/v1/invoices/generate';
import { ValidationError, NotFoundError } from '@schedulebox/shared';

/**
 * GET /api/v1/payments
 * List payments with pagination and filtering
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.PAYMENTS_VIEW],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(paymentListQuerySchema, req) as PaymentListQuery;
    const { page, limit, status, gateway, date_from, date_to, booking_id } = query;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build base WHERE conditions (company scoped + not deleted)
    const baseConditions = [eq(payments.companyId, companyId), isNull(payments.deletedAt)];

    // Add optional filters
    if (status) {
      baseConditions.push(eq(payments.status, status));
    }
    if (gateway) {
      baseConditions.push(eq(payments.gateway, gateway));
    }
    if (date_from) {
      // Use UTC to match TIMESTAMPTZ stored in the database
      baseConditions.push(gte(payments.createdAt, new Date(date_from + 'T00:00:00.000Z')));
    }
    if (date_to) {
      // Use UTC to match TIMESTAMPTZ stored in the database
      const endOfDay = new Date(date_to + 'T23:59:59.999Z');
      baseConditions.push(lte(payments.createdAt, endOfDay));
    }
    if (booking_id) {
      // Find booking by UUID and get internal ID
      const [booking] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.uuid, String(booking_id)), eq(bookings.companyId, companyId)))
        .limit(1);

      if (booking) {
        baseConditions.push(eq(payments.bookingId, booking.id));
      } else {
        // Return empty result if booking not found (invalid filter)
        return paginatedResponse([], {
          total: 0,
          page,
          limit,
          total_pages: 0,
        });
      }
    }

    // Query payments with customer and service names via JOINs
    const data = await db
      .select({
        id: payments.id,
        uuid: payments.uuid,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        customerName: customers.name,
        serviceName: services.name,
      })
      .from(payments)
      .innerJoin(customers, eq(payments.customerId, customers.id))
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(and(...baseConditions))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination metadata
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(and(...baseConditions));
    const totalCount = countResult.count;

    // Aggregate stats for KPI cards (respects active filters)
    const [aggregates] = await db
      .select({
        total_revenue: sql<string>`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amount}::numeric else 0 end), 0)::text`,
        paid_count: sql<number>`count(*) filter (where ${payments.status} = 'paid')::int`,
        pending_count: sql<number>`count(*) filter (where ${payments.status} = 'pending')::int`,
        refunded_count: sql<number>`count(*) filter (where ${payments.status} in ('refunded', 'partially_refunded'))::int`,
      })
      .from(payments)
      .where(and(...baseConditions));

    // Map to response format (use UUID, not SERIAL id, and snake_case)
    const responseData = data.map((payment) => ({
      id: payment.uuid,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      gateway: payment.gateway,
      gateway_transaction_id: payment.gatewayTransactionId,
      paid_at: payment.paidAt,
      created_at: payment.createdAt,
      customer_name: payment.customerName,
      service_name: payment.serviceName,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return paginatedResponse(responseData, {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
      aggregates: {
        total_revenue: aggregates.total_revenue,
        paid_count: aggregates.paid_count,
        pending_count: aggregates.pending_count,
        refunded_count: aggregates.refunded_count,
      },
    });
  },
});

/**
 * POST /api/v1/payments
 * Create manual payment record (cash, bank_transfer only)
 * This is for MANUAL payment recording, not Comgate/QR (those have dedicated endpoints)
 */
export const POST = createRouteHandler({
  bodySchema: paymentCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.PAYMENTS_CREATE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const { booking_id, gateway, amount, currency } = body as PaymentCreate;

    // Validate gateway is manual only (cash or bank_transfer)
    if (gateway !== 'cash' && gateway !== 'bank_transfer') {
      throw new ValidationError(
        'This endpoint is only for manual payments (cash, bank_transfer). Use dedicated endpoints for Comgate and QR payments.',
      );
    }

    // Find booking by UUID
    const [booking] = await db
      .select({
        id: bookings.id,
        uuid: bookings.uuid,
        companyId: bookings.companyId,
        customerId: bookings.customerId,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.uuid, booking_id))
      .limit(1);

    // Validate booking exists and belongs to company
    if (!booking || booking.companyId !== companyId) {
      throw new NotFoundError('Booking not found');
    }

    // Validate booking status allows payment
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw new ValidationError('Cannot create payment for cancelled or completed booking');
    }

    // Create payment record with status='paid' (manual payments are immediately confirmed)
    const payment = await createPaymentRecord({
      companyId,
      bookingId: booking.id,
      customerId: booking.customerId,
      amount: amount.toString(),
      currency,
      gateway,
    });

    // Update payment status to 'paid' with paidAt timestamp
    const extras: UpdatePaymentExtras = {
      paidAt: new Date(),
    };
    const updatedPayment = await updatePaymentStatus(payment.id, 'paid', extras);

    // Publish payment completed event (fire-and-forget)
    try {
      await publishEvent(
        createPaymentCompletedEvent({
          paymentUuid: updatedPayment.uuid ?? '',
          bookingUuid: booking.uuid ?? '',
          companyId,
          amount: updatedPayment.amount ?? '0',
          currency: updatedPayment.currency ?? 'CZK',
          gateway: updatedPayment.gateway ?? 'cash',
          completedAt: (updatedPayment.paidAt ?? new Date()).toISOString(),
        }),
      );
    } catch (error) {
      console.error('[Payment Create] Event publish failed:', error);
      // Don't fail the request
    }

    // Call SAGA handler to confirm booking
    await handlePaymentCompleted({
      paymentUuid: updatedPayment.uuid ?? '',
      bookingUuid: booking.uuid ?? '',
      companyId,
      amount: updatedPayment.amount ?? '0',
      currency: updatedPayment.currency ?? 'CZK',
      gateway: updatedPayment.gateway ?? 'cash',
      completedAt: (updatedPayment.paidAt ?? new Date()).toISOString(),
    });

    // Create invoice within transaction
    await db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createInvoiceForPayment(updatedPayment.id, companyId, tx as any);
    });

    // Return created payment (use UUID, not SERIAL id)
    return createdResponse({
      id: updatedPayment.uuid,
      booking_id: booking.uuid,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      status: updatedPayment.status,
      gateway: updatedPayment.gateway,
      gateway_transaction_id: updatedPayment.gatewayTransactionId,
      paid_at: updatedPayment.paidAt,
      created_at: updatedPayment.createdAt,
    });
  },
});
