/**
 * POST /api/v1/public/bookings/[uuid]/review
 * Public review submission - no authentication required
 *
 * Allows customers to submit a review for a completed booking.
 * Email verification ensures only the actual customer can review.
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, bookings, reviews, customers } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { createdResponse } from '@/lib/utils/response';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '@schedulebox/shared';

const reviewBodySchema = z.object({
  email: z.string().email(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

type ReviewBody = z.infer<typeof reviewBodySchema>;

const bookingUuidParamSchema = z.object({
  uuid: z.string().uuid(),
});

type BookingUuidParam = z.infer<typeof bookingUuidParamSchema>;

export const POST = createRouteHandler<ReviewBody, BookingUuidParam>({
  requiresAuth: false,
  bodySchema: reviewBodySchema,
  paramsSchema: bookingUuidParamSchema,
  handler: async ({ body, params }) => {
    // 1. Find booking by UUID with customer and service info
    const [booking] = await db
      .select({
        id: bookings.id,
        uuid: bookings.uuid,
        status: bookings.status,
        companyId: bookings.companyId,
        customerId: bookings.customerId,
        serviceId: bookings.serviceId,
        employeeId: bookings.employeeId,
        customerEmail: customers.email,
      })
      .from(bookings)
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .where(eq(bookings.uuid, params.uuid))
      .limit(1);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // 2. Verify email matches the booking's customer email
    if (
      !booking.customerEmail ||
      booking.customerEmail.toLowerCase() !== body.email.toLowerCase()
    ) {
      throw new ForbiddenError('Email does not match the booking customer');
    }

    // 3. Only allow reviews for completed bookings
    if (booking.status !== 'completed') {
      throw new ValidationError('Only completed bookings can be reviewed', 'BOOKING_NOT_COMPLETED');
    }

    // 4. Check if review already exists for this booking
    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.bookingId, booking.id))
      .limit(1);

    if (existingReview) {
      throw new ConflictError(
        'A review has already been submitted for this booking',
        'DUPLICATE_REVIEW',
      );
    }

    // 5. Create the review
    const [review] = await db
      .insert(reviews)
      .values({
        companyId: booking.companyId,
        customerId: booking.customerId,
        bookingId: booking.id,
        serviceId: booking.serviceId,
        employeeId: booking.employeeId,
        rating: body.rating,
        comment: body.comment || null,
        isPublished: true,
        redirectedTo: 'internal',
      })
      .returning({
        uuid: reviews.uuid,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
      });

    return createdResponse({
      id: review.uuid,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt?.toISOString(),
    });
  },
});
