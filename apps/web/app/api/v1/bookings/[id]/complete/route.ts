/**
 * Booking Complete Endpoint
 * POST /api/v1/bookings/:id/complete - Mark a confirmed booking as completed
 */

import { eq } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { bookingIdParamSchema, type BookingIdParam } from '@/validations/booking';
import { completeBooking } from '@/lib/booking/booking-transitions';
import { triggerWebhooks } from '@/lib/webhooks/trigger';

/**
 * POST /api/v1/bookings/:id/complete
 * Mark a confirmed booking as completed (transition: confirmed -> completed)
 *
 * @returns Updated booking with status='completed'
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
    const booking = await completeBooking(bookingRecord.id, companyId);

    // Fire-and-forget webhook trigger
    void triggerWebhooks(companyId, 'booking.completed', {
      booking_id: booking.id,
      customer_name: booking.customer.name,
      service_name: booking.service.name,
      start_time: booking.startTime,
      status: 'completed',
    });

    return successResponse(booking);
  },
});
