/**
 * Recurring Booking Series - List and Create
 * GET  /api/v1/bookings/recurring - List recurring series with pagination
 * POST /api/v1/bookings/recurring - Create recurring series with occurrence generation
 *
 * NOTE: recurring_series table may not exist in production (migration 0006 not applied).
 * Handlers return empty results gracefully when the table is missing.
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

/**
 * GET /api/v1/bookings/recurring
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    try {
      const { listRecurringSeries } = await import('@/lib/booking/recurring-service');
      const userSub = user?.sub ?? '';
      const { companyId } = await findCompanyId(userSub);
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const query = recurringSeriesListQuerySchema.parse(searchParams);
      const { data, meta } = await listRecurringSeries(companyId, query);
      return paginatedResponse(data, meta);
    } catch (e: unknown) {
      if (e instanceof Error && e.message?.includes('does not exist')) {
        return paginatedResponse([], { page: 1, limit: 20, total: 0, total_pages: 0 });
      }
      throw e;
    }
  },
});

/**
 * POST /api/v1/bookings/recurring
 */
export const POST = createRouteHandler({
  bodySchema: recurringSeriesCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_CREATE],
  handler: async ({ body, user }) => {
    const { createRecurringSeries } = await import('@/lib/booking/recurring-service');
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

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
