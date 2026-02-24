/**
 * Organization Location Detail Endpoints
 * PUT    /api/v1/organizations/[id]/locations/[locationId] - Update location
 * DELETE /api/v1/organizations/[id]/locations/[locationId] - Deactivate location (soft-disable)
 */

import { eq, and } from 'drizzle-orm';
import { db, users, companies, organizations, organizationMembers } from '@schedulebox/database';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import {
  orgLocationParamsSchema,
  updateLocationSchema,
  type OrgLocationParams,
  type UpdateLocationInput,
} from '@/validations/organization';

/**
 * Helper: resolve user internal ID from UUID
 */
async function getUserInternalId(userUuid: string): Promise<number> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user.id;
}

/**
 * Helper: verify user is franchise_owner of the org and location belongs to org
 */
async function verifyFranchiseOwnerAndLocation(
  orgUuid: string,
  locationUuid: string,
  userId: number,
) {
  // Get organization by UUID
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.uuid, orgUuid))
    .limit(1);

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  // Verify user is franchise_owner
  const [membership] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.organizationId, org.id), eq(organizationMembers.userId, userId)),
    )
    .limit(1);

  if (!membership) {
    throw new ForbiddenError('You are not a member of this organization');
  }

  if (membership.role !== 'franchise_owner') {
    throw new ForbiddenError('Only franchise owners can manage locations');
  }

  // Verify location (company) belongs to this org
  const [location] = await db
    .select({
      id: companies.id,
      organizationId: companies.organizationId,
    })
    .from(companies)
    .where(eq(companies.uuid, locationUuid))
    .limit(1);

  if (!location) {
    throw new NotFoundError('Location not found');
  }

  if (location.organizationId !== org.id) {
    throw new ForbiddenError('Location does not belong to this organization');
  }

  return { orgId: org.id, locationId: location.id };
}

/**
 * PUT /api/v1/organizations/[id]/locations/[locationId]
 * Update location details (franchise_owner only)
 */
export const PUT = createRouteHandler<UpdateLocationInput, OrgLocationParams>({
  paramsSchema: orgLocationParamsSchema,
  bodySchema: updateLocationSchema,
  requiresAuth: true,
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    await verifyFranchiseOwnerAndLocation(params.id, params.locationId, userId);

    // Build update set from provided fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address_street !== undefined) updateData.addressStreet = body.address_street;
    if (body.address_city !== undefined) updateData.addressCity = body.address_city;
    if (body.address_zip !== undefined) updateData.addressZip = body.address_zip;
    if (body.is_active !== undefined) updateData.isActive = body.is_active;

    // Update the company/location
    const [updated] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.uuid, params.locationId))
      .returning();

    return successResponse({
      uuid: updated.uuid,
      name: updated.name,
      slug: updated.slug,
      email: updated.email,
      phone: updated.phone,
      address_street: updated.addressStreet,
      address_city: updated.addressCity,
      address_zip: updated.addressZip,
      is_active: updated.isActive,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    });
  },
});

/**
 * DELETE /api/v1/organizations/[id]/locations/[locationId]
 * Deactivate a location (soft-disable). Does NOT delete any data.
 * Historical bookings, customers, payments all remain intact.
 */
export const DELETE = createRouteHandler<undefined, OrgLocationParams>({
  paramsSchema: orgLocationParamsSchema,
  requiresAuth: true,
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    await verifyFranchiseOwnerAndLocation(params.id, params.locationId, userId);

    // Soft-disable: set isActive = false (NO data deletion)
    await db
      .update(companies)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(companies.uuid, params.locationId));

    return successResponse({
      deactivated: true,
      company_uuid: params.locationId,
    });
  },
});
