/**
 * QR Payment Generate Endpoint
 * POST /api/v1/payments/qr-payment/generate
 *
 * Generates SPD format QR code for on-site customer payments.
 * Employee generates QR code, customer scans with their bank app.
 *
 * Payment confirmation must be done manually via payment update endpoint
 * (or in future via FIO Bank API integration) since QR payments don't have webhooks.
 */

import { eq } from 'drizzle-orm';
import { db, bookings, companies, payments } from '@schedulebox/database';
import { NotFoundError, ValidationError } from '@schedulebox/shared';
import { qrPaymentGenerateSchema } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { createPaymentRecord } from '@/app/api/v1/payments/service';
import { generateCzechQRPayment } from '@/app/api/v1/payments/qr-payment/client';
import { publishEvent, createPaymentInitiatedEvent } from '@schedulebox/events';

/**
 * POST /api/v1/payments/qr-payment/generate
 * Generate QR payment code for booking
 *
 * @returns QR code as base64 PNG, SPD string, and variable symbol
 */
export const POST = createRouteHandler<{ booking_id: string }>({
  bodySchema: qrPaymentGenerateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // 1. Fetch booking with customer and service details
    const [booking] = await db
      .select({
        id: bookings.id,
        uuid: bookings.uuid,
        companyId: bookings.companyId,
        customerId: bookings.customerId,
        price: bookings.price,
        currency: bookings.currency,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.uuid, body.booking_id))
      .limit(1);

    if (!booking || booking.companyId !== companyId) {
      throw new NotFoundError('Booking not found');
    }

    // 2. Verify booking status allows payment
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new ValidationError(
        `Cannot generate payment for booking with status '${booking.status}'. Only 'pending' or 'confirmed' bookings can be paid.`,
      );
    }

    // 3. Check if a pending payment already exists (idempotency)
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, booking.id))
      .limit(1);

    if (existingPayment && existingPayment.status === 'pending') {
      // Re-generate QR code for existing payment
      const [company] = await db
        .select({ settings: companies.settings })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      const companySettings = (company?.settings as Record<string, unknown> | null) || {};
      const iban =
        (companySettings.iban as string | undefined) || process.env.COMPANY_DEFAULT_IBAN || '';

      if (!iban) {
        throw new ValidationError(
          'Company bank account (IBAN) not configured. Please update company settings.',
        );
      }

      const variableSymbol = booking.id.toString().padStart(10, '0');

      const { qrCodeBase64, spdString } = await generateCzechQRPayment({
        iban,
        amount: parseFloat(booking.price),
        currency: booking.currency || 'CZK',
        variableSymbol,
        message: `ScheduleBox #${booking.uuid.slice(0, 8)}`,
      });

      return successResponse({
        qr_code_base64: qrCodeBase64,
        spd_string: spdString,
        variable_symbol: variableSymbol,
        payment_id: existingPayment.uuid,
      });
    }

    // 4. Get company IBAN from settings or env var
    const [company] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const companySettings = (company?.settings as Record<string, unknown> | null) || {};
    const iban =
      (companySettings.iban as string | undefined) || process.env.COMPANY_DEFAULT_IBAN || '';

    if (!iban) {
      throw new ValidationError(
        'Company bank account (IBAN) not configured. Please update company settings.',
      );
    }

    // 5. Generate variable symbol from booking ID (zero-padded to 10 digits)
    const variableSymbol = booking.id.toString().padStart(10, '0');

    // 6. Generate QR code with SPD format
    const { qrCodeBase64, spdString } = await generateCzechQRPayment({
      iban,
      amount: parseFloat(booking.price),
      currency: booking.currency || 'CZK',
      variableSymbol,
      message: `ScheduleBox #${booking.uuid.slice(0, 8)}`,
    });

    // 7. Create payment record
    const payment = await createPaymentRecord({
      companyId,
      bookingId: booking.id,
      customerId: booking.customerId,
      amount: booking.price,
      currency: booking.currency || 'CZK',
      gateway: 'qrcomat',
      // QR payment doesn't have gatewayTransactionId upfront
      // The variable symbol IS the reference for tracking
    });

    // 8. Publish payment.initiated event
    try {
      const event = createPaymentInitiatedEvent({
        paymentUuid: payment.uuid,
        bookingUuid: booking.uuid,
        companyId,
        amount: payment.amount,
        currency: payment.currency || 'CZK',
        gateway: 'qrcomat',
        gatewayTransactionId: variableSymbol, // Use variable symbol as transaction reference
      });
      await publishEvent(event);
    } catch (error) {
      // Fire-and-forget: log error but don't fail the request
      console.error('[QR Payment Generate] Failed to publish payment.initiated event:', error);
    }

    // 9. Return QR code, SPD string, and payment details
    return successResponse({
      qr_code_base64: qrCodeBase64,
      spd_string: spdString,
      variable_symbol: variableSymbol,
      payment_id: payment.uuid as string,
    });
  },
});
