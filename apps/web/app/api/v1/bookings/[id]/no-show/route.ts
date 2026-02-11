/**
 * Booking No-Show Endpoint
 * POST /api/v1/bookings/:id/no-show - Mark a confirmed booking as no-show
 */

import { eq } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { bookingIdParamSchema, type BookingIdParam } from '@/validations/booking';
import { markNoShow } from '@/lib/booking/booking-transitions';

/**
 * POST /api/v1/bookings/:id/no-show
 * Mark a confirmed booking as no-show (transition: confirmed -> no_show)
 *
 * Customer's no_show_count is automatically incremented by database trigger.
 *
 * @returns Updated booking with status='no_show'
 * @throws 404 if booking not found
 * @throws 422 if invalid state transition (booking not in confirmed status)
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
    const booking = await markNoShow(bookingRecord.id, companyId);

    return successResponse(booking);
  },
});
