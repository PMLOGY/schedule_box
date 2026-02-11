/**
 * Booking Confirm Endpoint
 * POST /api/v1/bookings/:id/confirm - Confirm a pending booking
 */

import { eq } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { bookingIdParamSchema, type BookingIdParam } from '@/validations/booking';
import { confirmBooking } from '@/lib/booking/booking-transitions';

/**
 * POST /api/v1/bookings/:id/confirm
 * Confirm a pending booking (transition: pending -> confirmed)
 *
 * @returns Updated booking with status='confirmed'
 * @throws 404 if booking not found
 * @throws 422 if invalid state transition (booking not in pending status)
 */
export const POST = createRouteHandler<undefined, BookingIdParam>({
  paramsSchema: bookingIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

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
    const booking = await confirmBooking(bookingRecord.id, companyId);

    return successResponse(booking);
  },
});
