/**
 * Membership Types List and Create Endpoints
 * GET  /api/v1/memberships - List membership types for company
 * POST /api/v1/memberships - Create new membership type
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { membershipTypeCreateSchema, type MembershipTypeCreate } from '@/validations/membership';
import { listMembershipTypes, createMembershipType } from '@/lib/membership/membership-service';

/**
 * GET /api/v1/memberships
 * List all active membership types for the authenticated user's company
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ user }) => {
    const { companyId } = await findCompanyId(user!.sub);
    const types = await listMembershipTypes(companyId);
    return successResponse(types);
  },
});

/**
 * POST /api/v1/memberships
 * Create a new membership type
 */
export const POST = createRouteHandler<MembershipTypeCreate>({
  bodySchema: membershipTypeCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_CREATE],
  handler: async ({ body, user }) => {
    const { companyId } = await findCompanyId(user!.sub);
    const created = await createMembershipType(body, companyId);
    return createdResponse(created);
  },
});
