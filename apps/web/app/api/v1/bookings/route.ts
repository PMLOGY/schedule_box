/**
 * Booking List and Create Endpoints
 * GET  /api/v1/bookings - List bookings with pagination and filtering
 * POST /api/v1/bookings - Create new booking with double-booking prevention
 */

import { eq } from 'drizzle-orm';
import { db, users } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, paginatedResponse } from '@/lib/utils/response';
import {
  bookingCreateSchema,
  bookingListQuerySchema,
  type BookingListQuery,
} from '@/validations/booking';
import { createBooking, listBookings } from '@/lib/booking/booking-service';

/**
 * GET /api/v1/bookings
 * List bookings with pagination, filtering by status/date/employee/customer/service
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(bookingListQuerySchema, req) as BookingListQuery;

    // Call service layer
    const { data, meta } = await listBookings(query, companyId);

    return paginatedResponse(data, meta);
  },
});

/**
 * POST /api/v1/bookings
 * Create new booking with double-booking prevention
 *
 * Returns:
 * - 201: Booking created successfully
 * - 409: Time slot already taken (SLOT_TAKEN error code)
 * - 404: Service or employee not found
 * - 400: Validation error (employee not assigned to service, service inactive, etc.)
 */
export const POST = createRouteHandler({
  bodySchema: bookingCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_CREATE],
  handler: async ({ body, user }) => {
    // Find user's company ID and user internal ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Get user internal ID (needed for audit trail)
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userSub))
      .limit(1);

    if (!userRecord) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    // Call service layer (may throw AppError with code SLOT_TAKEN if conflict)
    // Source defaults to 'online' if not provided (applied by Zod schema)
    const booking = await createBooking(
      {
        ...body,
        source: body.source ?? 'online',
      },
      {
        companyId,
        userId: userRecord.id,
      },
    );

    // Return 201 Created
    return successResponse(booking, 201);
  },
});
