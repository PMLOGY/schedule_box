/**
 * Recurring Booking Series - List and Create
 * GET  /api/v1/bookings/recurring - List recurring series with pagination
 * POST /api/v1/bookings/recurring - Create recurring series with occurrence generation
 */

import { eq } from 'drizzle-orm';
import { db, users } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, paginatedResponse } from '@/lib/utils/response';
import {
  recurringSeriesCreateSchema,
  recurringSeriesListQuerySchema,
} from '@/validations/recurring';
import { createRecurringSeries, listRecurringSeries } from '@/lib/booking/recurring-service';

/**
 * GET /api/v1/bookings/recurring
 * List recurring series with pagination and optional isActive filter
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse query params from URL directly (same pattern as bookingListQuerySchema)
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = recurringSeriesListQuerySchema.parse(searchParams);

    const { data, meta } = await listRecurringSeries(companyId, query);

    return paginatedResponse(data, meta);
  },
});

/**
 * POST /api/v1/bookings/recurring
 * Create a recurring booking series
 *
 * Generates individual booking occurrences based on repeat pattern.
 * Occurrences that conflict with existing bookings are skipped (not errors).
 *
 * Returns:
 * - 201: Series created with occurrence counts
 * - 404: Service, employee, or customer not found
 * - 400: Validation error
 */
export const POST = createRouteHandler({
  bodySchema: recurringSeriesCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_CREATE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Get user internal ID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userSub))
      .limit(1);

    if (!userRecord) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    const series = await createRecurringSeries(body, {
      companyId,
      userId: userRecord.id,
    });

    return successResponse(series, 201);
  },
});
