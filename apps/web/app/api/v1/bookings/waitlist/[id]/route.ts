/**
 * Booking Waitlist Entry Detail and Cancel
 * GET    /api/v1/bookings/waitlist/:id - Get single waitlist entry
 * DELETE /api/v1/bookings/waitlist/:id - Cancel waitlist entry
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { waitlistIdParamSchema, type WaitlistIdParam } from '@/validations/waitlist';
import { getWaitlistEntry, cancelWaitlistEntry } from '@/lib/waitlist/waitlist-service';

/**
 * GET /api/v1/bookings/waitlist/:id
 * Get a single waitlist entry by UUID.
 */
export const GET = createRouteHandler<undefined, WaitlistIdParam>({
  paramsSchema: waitlistIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const entry = await getWaitlistEntry(params.id, companyId);

    return successResponse(entry);
  },
});

/**
 * DELETE /api/v1/bookings/waitlist/:id
 * Cancel a waitlist entry and reposition remaining entries.
 *
 * Returns:
 * - 200: Cancelled entry
 * - 404: Entry not found
 * - 400: Entry is not in 'waiting' status
 */
export const DELETE = createRouteHandler<undefined, WaitlistIdParam>({
  paramsSchema: waitlistIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const entry = await cancelWaitlistEntry(params.id, companyId);

    return successResponse(entry);
  },
});
