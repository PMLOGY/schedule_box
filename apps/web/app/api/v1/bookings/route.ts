/**
 * Booking List and Create Endpoints
 * GET  /api/v1/bookings - List bookings with pagination and filtering
 * POST /api/v1/bookings - Create new booking with double-booking prevention
 */

import { eq } from 'drizzle-orm';
import { trace } from '@opentelemetry/api';
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
import { checkBookingLimit, incrementBookingCounter } from '@/lib/usage/usage-service';
import { logRouteComplete, getRequestId } from '@/lib/logger/route-logger';

/**
 * GET /api/v1/bookings
 * List bookings with pagination, filtering by status/date/employee/customer/service
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    return trace
      .getTracer('schedulebox')
      .startActiveSpan('schedulebox.booking.list', async (span) => {
        try {
          // Find user's company ID for tenant isolation
          const userSub = user?.sub ?? '';
          const { companyId } = await findCompanyId(userSub);

          span.setAttributes({ 'http.route': '/api/v1/bookings', 'booking.company_id': companyId });

          // Parse and validate query parameters
          const query = validateQuery(bookingListQuerySchema, req) as BookingListQuery;

          // Call service layer
          const { data, meta } = await listBookings(query, companyId);

          const response = paginatedResponse(data, meta);
          span.end();
          logRouteComplete({
            route: '/api/v1/bookings',
            method: 'GET',
            status: 200,
            duration_ms: Date.now() - startTime,
            request_id: requestId,
          });
          return response;
        } catch (error) {
          span.recordException(error as Error);
          span.end();
          logRouteComplete({
            route: '/api/v1/bookings',
            method: 'GET',
            status: 500,
            duration_ms: Date.now() - startTime,
            request_id: requestId,
            error: error as Error,
          });
          throw error;
        }
      });
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
  handler: async ({ body, req, user }) => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    return trace
      .getTracer('schedulebox')
      .startActiveSpan('schedulebox.booking.list', async (span) => {
        try {
          // Find user's company ID and user internal ID for tenant isolation
          const userSub = user?.sub ?? '';
          const { companyId } = await findCompanyId(userSub);

          span.setAttributes({
            'http.route': '/api/v1/bookings',
            'booking.company_id': companyId,
          });

          // Check booking limit for company's plan tier
          await checkBookingLimit(companyId);

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

          // Increment booking counter for usage tracking (fire-and-forget, non-blocking)
          incrementBookingCounter(companyId).catch((err) => {
            console.error('[UsageCounter] Failed to increment booking counter:', err);
          });

          const response = successResponse(booking, 201);
          span.end();
          logRouteComplete({
            route: '/api/v1/bookings',
            method: 'POST',
            status: 201,
            duration_ms: Date.now() - startTime,
            request_id: requestId,
          });
          return response;
        } catch (error) {
          span.recordException(error as Error);
          span.end();
          logRouteComplete({
            route: '/api/v1/bookings',
            method: 'POST',
            status: 500,
            duration_ms: Date.now() - startTime,
            request_id: requestId,
            error: error as Error,
          });
          throw error;
        }
      });
  },
});
