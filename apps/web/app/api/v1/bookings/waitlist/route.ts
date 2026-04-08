/**
 * Booking Waitlist List and Join Endpoints
 * POST /api/v1/bookings/waitlist - Join waitlist for a full group class
 * GET  /api/v1/bookings/waitlist - List waitlist entries for company
 */

import { eq } from 'drizzle-orm';
import { db, services } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { waitlistJoinSchema, waitlistListQuerySchema } from '@/validations/waitlist';
import { joinWaitlist, listWaitlistEntries } from '@/lib/waitlist/waitlist-service';

/**
 * POST /api/v1/bookings/waitlist
 * Join waitlist when a group class is full.
 *
 * Returns:
 * - 201: Waitlist entry created with position
 * - 400: Service is not a group class, slot is not full, or duplicate entry
 * - 404: Service or customer not found
 */
export const POST = createRouteHandler({
  bodySchema: waitlistJoinSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_CREATE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const entry = await joinWaitlist(body, companyId);

    return createdResponse(entry);
  },
});

/**
 * GET /api/v1/bookings/waitlist
 * List waitlist entries for the company, with optional serviceId and status filters.
 *
 * Query params:
 * - serviceId (optional, UUID): Filter by service
 * - status (optional): Filter by status (default: 'waiting')
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    const query = validateQuery(waitlistListQuerySchema, req);

    // Resolve service UUID to internal ID if provided
    let serviceId: number | undefined;
    if (query.serviceId) {
      const [service] = await db
        .select({ id: services.id })
        .from(services)
        .where(eq(services.uuid, query.serviceId))
        .limit(1);
      serviceId = service?.id;
    }

    try {
      const entries = await listWaitlistEntries(companyId, {
        serviceId,
        status: query.status,
      });
      return successResponse(entries);
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        (e.message?.includes('does not exist') || e.message?.includes('Failed query'))
      ) {
        return successResponse([]);
      }
      throw e;
    }
  },
});
