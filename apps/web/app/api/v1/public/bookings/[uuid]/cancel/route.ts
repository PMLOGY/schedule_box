/**
 * POST /api/v1/public/bookings/[uuid]/cancel
 * Public booking cancellation - no auth, requires email verification
 *
 * Body: { email: string }
 * Verifies the email matches the booking's customer email.
 * Only allows cancellation of pending/confirmed bookings.
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, bookings, customers } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError, ValidationError, AppError } from '@schedulebox/shared';

const bookingUuidParamSchema = z.object({
  uuid: z.string().uuid(),
});

type BookingUuidParam = z.infer<typeof bookingUuidParamSchema>;

const cancelBodySchema = z.object({
  email: z.string().email(),
});

type CancelBody = z.infer<typeof cancelBodySchema>;

export const POST = createRouteHandler<CancelBody, BookingUuidParam>({
  requiresAuth: false,
  bodySchema: cancelBodySchema,
  paramsSchema: bookingUuidParamSchema,
  handler: async ({ body, params }) => {
    // Find booking by UUID
    const [booking] = await db
      .select({
        id: bookings.id,
        uuid: bookings.uuid,
        status: bookings.status,
        customerId: bookings.customerId,
      })
      .from(bookings)
      .where(eq(bookings.uuid, params.uuid))
      .limit(1);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Get customer email
    const [customer] = await db
      .select({ email: customers.email })
      .from(customers)
      .where(eq(customers.id, booking.customerId))
      .limit(1);

    if (!customer || !customer.email) {
      throw new NotFoundError('Booking not found');
    }

    // Verify email matches (case-insensitive)
    if (customer.email.toLowerCase() !== body.email.toLowerCase()) {
      throw new ValidationError('Email does not match the booking');
    }

    // Only allow cancellation of pending/confirmed bookings
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new AppError(
        'INVALID_STATUS',
        `Cannot cancel a booking with status: ${booking.status}`,
        400,
      );
    }

    // Update booking status to cancelled
    const [updated] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'customer',
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning({
        uuid: bookings.uuid,
        status: bookings.status,
        cancelledAt: bookings.cancelledAt,
      });

    return successResponse({
      uuid: updated.uuid,
      status: updated.status,
      cancelled_at: updated.cancelledAt?.toISOString() || null,
      message: 'Booking cancelled successfully',
    });
  },
});
