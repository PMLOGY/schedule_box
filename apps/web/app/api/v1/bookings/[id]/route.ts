/**
 * Booking Detail, Update, and Delete Endpoints
 * GET    /api/v1/bookings/:id - Get booking detail
 * PUT    /api/v1/bookings/:id - Update booking (with availability re-check on time change)
 * DELETE /api/v1/bookings/:id - Soft delete booking
 */

import { eq } from 'drizzle-orm';
import { db, bookings } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import {
  bookingIdParamSchema,
  bookingUpdateSchema,
  type BookingIdParam,
  type BookingUpdate,
} from '@/validations/booking';
import { getBooking, updateBooking, deleteBooking } from '@/lib/booking/booking-service';

/**
 * GET /api/v1/bookings/:id
 * Get booking detail with customer, service, and employee data
 */
export const GET = createRouteHandler<undefined, BookingIdParam>({
  paramsSchema: bookingIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
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

    // Call service layer
    const booking = await getBooking(bookingRecord.id, companyId);

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return successResponse(booking);
  },
});

/**
 * PUT /api/v1/bookings/:id
 * Update booking fields
 *
 * If start_time is changed, re-validates availability with SELECT FOR UPDATE
 *
 * Returns:
 * - 200: Booking updated successfully
 * - 409: New time slot already taken (SLOT_TAKEN error code)
 * - 404: Booking not found
 */
export const PUT = createRouteHandler<BookingUpdate, BookingIdParam>({
  bodySchema: bookingUpdateSchema,
  paramsSchema: bookingIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ body, params, user }) => {
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

    // Call service layer (may throw AppError with code SLOT_TAKEN if conflict)
    const updatedBooking = await updateBooking(bookingRecord.id, body, companyId);

    return successResponse(updatedBooking);
  },
});

/**
 * DELETE /api/v1/bookings/:id
 * Soft delete booking (sets deletedAt timestamp)
 *
 * Returns:
 * - 204: Booking deleted successfully (no content)
 * - 404: Booking not found
 */
export const DELETE = createRouteHandler<undefined, BookingIdParam>({
  paramsSchema: bookingIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_DELETE],
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

    // Call service layer
    await deleteBooking(bookingRecord.id, companyId);

    // Return 204 No Content
    return noContentResponse();
  },
});
