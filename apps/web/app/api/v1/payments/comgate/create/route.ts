/**
 * Comgate Payment Initiation Endpoint
 * POST /api/v1/payments/comgate/create - Create payment and get redirect URL
 */

import { eq } from 'drizzle-orm';
import { db, bookings, customers, payments } from '@schedulebox/database';
import { AppError, comgateCreateSchema } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { createPaymentRecord } from '@/app/api/v1/payments/service';
import { initComgatePayment } from '@/app/api/v1/payments/comgate/client';
import { resolveComgateCredentials } from '@/lib/payment-provider/resolve';
import { publishEvent } from '@schedulebox/events';
import { createPaymentInitiatedEvent } from '@schedulebox/events';

/**
 * POST /api/v1/payments/comgate/create
 * Initiate Comgate payment for a booking
 *
 * Returns:
 * - 200: Payment initiated, returns transaction_id and redirect_url
 * - 404: Booking not found
 * - 400: Booking not in pending status or payment already exists
 */
export const POST = createRouteHandler({
  bodySchema: comgateCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const { booking_id } = body;

    // Fetch booking with details
    const [booking] = await db
      .select({
        id: bookings.id,
        uuid: bookings.uuid,
        companyId: bookings.companyId,
        customerId: bookings.customerId,
        status: bookings.status,
        price: bookings.price,
        currency: bookings.currency,
      })
      .from(bookings)
      .where(eq(bookings.uuid, booking_id))
      .limit(1);

    if (!booking) {
      throw new AppError('Booking not found', 'NOT_FOUND', 404);
    }

    // Verify booking belongs to user's company
    if (booking.companyId !== companyId) {
      throw new AppError('Booking not found', 'NOT_FOUND', 404);
    }

    // Verify booking is in pending status
    if (booking.status !== 'pending') {
      throw new AppError('Only pending bookings can be paid', 'VALIDATION_ERROR', 400);
    }

    // Check if payment already exists for this booking
    const [existingPayment] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.bookingId, booking.id))
      .limit(1);

    if (existingPayment) {
      throw new AppError('Payment already exists for this booking', 'VALIDATION_ERROR', 400);
    }

    // Fetch customer email
    const [customer] = await db
      .select({ email: customers.email })
      .from(customers)
      .where(eq(customers.id, booking.customerId))
      .limit(1);

    if (!customer) {
      throw new AppError('Customer not found', 'NOT_FOUND', 404);
    }

    // Build callback and redirect URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/api/v1/payments/comgate/callback?bookingId=${booking.uuid}`;
    const callbackUrl = `${baseUrl}/api/v1/webhooks/comgate`;

    // Validate required fields
    const currency = booking.currency || 'CZK';
    const email = customer.email;

    if (!email) {
      throw new AppError('Customer email is required', 'VALIDATION_ERROR', 400);
    }

    // Resolve per-company Comgate credentials (falls back to platform if not configured)
    const creds = await resolveComgateCredentials(companyId);
    console.log(
      `[Payment Create] Using ${creds.source} Comgate credentials for company ${companyId}`,
    );

    // Call Comgate API to create payment
    const { transactionId, redirectUrl: comgateRedirectUrl } = await initComgatePayment(
      {
        price: parseFloat(booking.price),
        currency,
        label: `ScheduleBox #${booking.uuid.slice(0, 8)}`,
        refId: booking.uuid,
        email,
        redirectUrl,
        callbackUrl,
      },
      { merchantId: creds.merchantId, secret: creds.secret, testMode: creds.testMode },
    );

    // Create payment record in database
    const payment = await createPaymentRecord({
      companyId,
      bookingId: booking.id,
      customerId: booking.customerId,
      amount: booking.price,
      currency,
      gateway: 'comgate',
      gatewayTransactionId: transactionId,
    });

    // Publish payment.initiated event (fire-and-forget)
    try {
      await publishEvent(
        createPaymentInitiatedEvent({
          paymentUuid: payment.uuid,
          bookingUuid: booking.uuid,
          companyId,
          amount: booking.price,
          currency,
          gateway: 'comgate',
          gatewayTransactionId: transactionId,
        }),
      );
    } catch (error) {
      // Log but don't fail the request
      console.error('Failed to publish payment.initiated event:', error);
    }

    return successResponse({
      transaction_id: transactionId,
      redirect_url: comgateRedirectUrl,
    });
  },
});
