/**
 * Booking Resize Endpoint
 * PATCH /api/v1/bookings/:id/resize - Change booking end time (duration)
 */

import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import { NotFoundError, AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { bookingIdParamSchema, type BookingIdParam } from '@/validations/booking';

const resizeBodySchema = z.object({
  end_time: z.string().datetime({ message: 'end_time must be a valid ISO 8601 datetime' }),
});

type ResizeBody = z.infer<typeof resizeBodySchema>;

/**
 * PATCH /api/v1/bookings/:id/resize
 * Update booking end time (drag-to-resize from calendar)
 *
 * Only allowed for pending or confirmed bookings.
 * Validates booking belongs to user's company (tenant isolation).
 *
 * @body end_time - New end time (ISO 8601)
 * @returns Updated booking
 * @throws 404 if booking not found
 * @throws 422 if booking is not in resizable status
 */
export const PATCH = createRouteHandler<ResizeBody, BookingIdParam>({
  paramsSchema: bookingIdParamSchema,
  bodySchema: resizeBodySchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find booking by UUID
    const [booking] = await db
      .select({
        id: bookings.id,
        uuid: bookings.uuid,
        companyId: bookings.companyId,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(and(eq(bookings.uuid, params.id), eq(bookings.companyId, companyId)))
      .limit(1);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Only allow resize for pending or confirmed bookings
    const RESIZABLE_STATUSES = ['pending', 'confirmed'];
    if (!booking.status || !RESIZABLE_STATUSES.includes(booking.status)) {
      throw new AppError(
        'INVALID_STATUS',
        'Only pending or confirmed bookings can be resized',
        422,
      );
    }

    // Validate new end time is after start time
    const newEndTime = new Date(body.end_time);
    const startTime = new Date(booking.startTime);
    if (newEndTime <= startTime) {
      throw new AppError('INVALID_TIME', 'End time must be after start time', 422);
    }

    // Update end time
    const [updated] = await db
      .update(bookings)
      .set({
        endTime: newEndTime,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning({
        id: bookings.id,
        uuid: bookings.uuid,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
      });

    return successResponse(updated);
  },
});
