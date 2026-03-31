/**
 * Membership Type Detail Endpoints
 * GET    /api/v1/memberships/[id] - Get membership type details
 * PUT    /api/v1/memberships/[id] - Update membership type
 * DELETE /api/v1/memberships/[id] - Soft delete membership type
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import {
  membershipTypeIdParamSchema,
  membershipTypeUpdateSchema,
  type MembershipTypeIdParam,
  type MembershipTypeUpdate,
} from '@/validations/membership';
import {
  getMembershipType,
  updateMembershipType,
  deleteMembershipType,
} from '@/lib/membership/membership-service';

/**
 * GET /api/v1/memberships/[id]
 * Get a single membership type by UUID
 */
export const GET = createRouteHandler<undefined, MembershipTypeIdParam>({
  paramsSchema: membershipTypeIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ params, user }) => {
    const { companyId } = await findCompanyId(user!.sub);
    const membershipType = await getMembershipType(params!.id, companyId);
    return successResponse(membershipType);
  },
});

/**
 * PUT /api/v1/memberships/[id]
 * Update a membership type
 */
export const PUT = createRouteHandler<MembershipTypeUpdate, MembershipTypeIdParam>({
  bodySchema: membershipTypeUpdateSchema,
  paramsSchema: membershipTypeIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_CREATE],
  handler: async ({ body, params, user }) => {
    const { companyId } = await findCompanyId(user!.sub);
    const updated = await updateMembershipType(params!.id, body, companyId);
    return successResponse(updated);
  },
});

/**
 * DELETE /api/v1/memberships/[id]
 * Soft delete a membership type (set isActive=false)
 */
export const DELETE = createRouteHandler<undefined, MembershipTypeIdParam>({
  paramsSchema: membershipTypeIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_DELETE],
  handler: async ({ params, user }) => {
    const { companyId } = await findCompanyId(user!.sub);
    await deleteMembershipType(params!.id, companyId);
    return noContentResponse();
  },
});
