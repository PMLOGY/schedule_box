/**
 * Booking Cancel Endpoint
 * POST /api/v1/bookings/:id/cancel - Cancel a booking with cancellation policy enforcement
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
  bookingCancelSchema,
  type BookingIdParam,
} from '@/validations/booking';
import { cancelBooking } from '@/lib/booking/booking-transitions';

/**
 * POST /api/v1/bookings/:id/cancel
 * Cancel a booking with cancellation policy enforcement
 *
 * Cancellation policy:
 * - Customer role: Cannot cancel within cancellationPolicyHours of start time
 * - Admin/employee roles: Can cancel anytime (bypass policy)
 *
 * @returns Updated booking with status='cancelled'
 * @throws 403 CANCELLATION_POLICY if customer attempts to cancel within policy window
 * @throws 404 if booking not found
 * @throws 422 if invalid state transition
 */
export const POST = createRouteHandler<{ reason?: string }, BookingIdParam>({
  paramsSchema: bookingIdParamSchema,
  bodySchema: bookingCancelSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ params, body, user }) => {
    // Find user's company ID and role for tenant isolation
    const userSub = user?.sub ?? '';
    const userRole = user?.role ?? 'customer';
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
      const booking = await cancelBooking(
        bookingRecord.id,
        { reason: body.reason },
        { companyId, userId, userRole },
      );

      return successResponse(booking);
    } catch (error) {
      // Re-throw CANCELLATION_POLICY errors with 403
      if (error instanceof AppError && error.code === 'CANCELLATION_POLICY') {
        throw error;
      }
      throw error;
    }
  },
});
