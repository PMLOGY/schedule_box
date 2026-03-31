/**
 * Customer Memberships Endpoints
 * GET  /api/v1/customers/[id]/memberships - List customer's memberships
 * POST /api/v1/customers/[id]/memberships - Assign membership to customer
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import {
  customerMembershipAssignSchema,
  customerIdParamSchema,
  type CustomerMembershipAssign,
  type CustomerIdParam,
} from '@/validations/membership';
import { listCustomerMemberships, assignMembership } from '@/lib/membership/membership-service';

/**
 * GET /api/v1/customers/[id]/memberships
 * List all memberships for a customer
 */
export const GET = createRouteHandler<undefined, CustomerIdParam>({
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ],
  handler: async ({ params, user }) => {
    const { companyId } = await findCompanyId(user!.sub);
    const memberships = await listCustomerMemberships(params!.id, companyId);
    return successResponse(memberships);
  },
});

/**
 * POST /api/v1/customers/[id]/memberships
 * Assign a membership to a customer
 */
export const POST = createRouteHandler<CustomerMembershipAssign, CustomerIdParam>({
  bodySchema: customerMembershipAssignSchema,
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_UPDATE],
  handler: async ({ body, params, user }) => {
    const { companyId } = await findCompanyId(user!.sub);
    const membership = await assignMembership(params!.id, body, companyId);
    return createdResponse(membership);
  },
});
