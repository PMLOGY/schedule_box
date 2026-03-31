/**
 * Recurring Series Detail, Update, and Cancel
 * GET    /api/v1/bookings/recurring/:id - Get series detail with occurrence count
 * PUT    /api/v1/bookings/recurring/:id - Edit series (updates all future occurrences)
 * DELETE /api/v1/bookings/recurring/:id - Cancel series (cancels all future occurrences)
 */

import { eq } from 'drizzle-orm';
import { db, users } from '@schedulebox/database';
import { AppError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import {
  recurringSeriesIdParamSchema,
  recurringSeriesUpdateSchema,
  type RecurringSeriesIdParam,
  type RecurringSeriesUpdate,
} from '@/validations/recurring';
import { getRecurringSeries, editSeries, cancelSeries } from '@/lib/booking/recurring-service';

/**
 * GET /api/v1/bookings/recurring/:id
 * Get recurring series detail with occurrence count
 */
export const GET = createRouteHandler<undefined, RecurringSeriesIdParam>({
  paramsSchema: recurringSeriesIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const series = await getRecurringSeries(params.id, companyId);

    return successResponse(series);
  },
});

/**
 * PUT /api/v1/bookings/recurring/:id
 * Edit series record and update all future occurrences
 *
 * Changes to time/employee are propagated to all future bookings in the series.
 * Occurrences with conflicts are skipped (not errors).
 *
 * Returns:
 * - 200: Updated series with modification count
 * - 404: Series not found
 * - 400: Validation error
 */
export const PUT = createRouteHandler<RecurringSeriesUpdate, RecurringSeriesIdParam>({
  bodySchema: recurringSeriesUpdateSchema,
  paramsSchema: recurringSeriesIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ body, params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const result = await editSeries(params.id, body, companyId);

    return successResponse(result);
  },
});

/**
 * DELETE /api/v1/bookings/recurring/:id
 * Cancel the entire series: deactivates series + cancels all future occurrences
 *
 * Uses booking-transitions cancelBooking for proper state machine + domain events.
 *
 * Returns:
 * - 200: Cancellation summary with count
 * - 404: Series not found
 */
export const DELETE = createRouteHandler<undefined, RecurringSeriesIdParam>({
  paramsSchema: recurringSeriesIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_DELETE],
  handler: async ({ params, user }) => {
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

    // Admin endpoint — cancel as admin role
    const result = await cancelSeries(params.id, companyId, {
      userId: userRecord.id,
      userRole: 'admin',
    });

    return successResponse({
      message: 'Series cancelled',
      cancelledOccurrences: result.cancelledCount,
    });
  },
});
