/**
 * Booking Reschedule Endpoint
 * POST /api/v1/bookings/:id/reschedule - Reschedule a booking to new time/employee
 */

import { eq } from 'drizzle-orm';
import { db, bookings, users } from '@schedulebox/database';
import { NotFoundError, AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import {
  bookingIdParamSchema,
  bookingRescheduleSchema,
  type BookingIdParam,
} from '@/validations/booking';
import { rescheduleBooking } from '@/lib/booking/booking-transitions';

/**
 * POST /api/v1/bookings/:id/reschedule
 * Reschedule a booking to new time and/or employee
 *
 * Uses SELECT FOR UPDATE to prevent double-booking during reschedule.
 * Excludes current booking from conflict check.
 *
 * @body start_time - New start time (ISO 8601)
 * @body employee_id - Optional new employee ID
 * @returns Updated booking with new start_time, end_time, and employee_id
 * @throws 404 if booking not found
 * @throws 409 SLOT_TAKEN if new time slot is already booked
 * @throws 422 if booking is not in pending or confirmed status
 */
export const POST = createRouteHandler<
  { start_time: string; employee_id?: number },
  BookingIdParam
>({
  paramsSchema: bookingIdParamSchema,
  bodySchema: bookingRescheduleSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ params, body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Get user ID from UUID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userSub))
      .limit(1);

    const userId = userRecord?.id ?? 0;

    // Convert UUID to internal ID
    const bookingUuid = params.id;
    const [bookingRecord] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.uuid, bookingUuid))
      .limit(1);

    if (!bookingRecord) {
      throw new NotFoundError('Booking not found');
    }

    // Call transition service
    try {
      const booking = await rescheduleBooking(
        bookingRecord.id,
        { start_time: body.start_time, employee_id: body.employee_id },
        { companyId, userId },
      );

      return successResponse(booking);
    } catch (error) {
      // Re-throw SLOT_TAKEN errors with 409
      if (error instanceof AppError && error.code === 'SLOT_TAKEN') {
        throw error;
      }
      throw error;
    }
  },
});
