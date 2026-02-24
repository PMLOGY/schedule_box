/**
 * Organization Detail Endpoints
 * GET  /api/v1/organizations/[id] - Get organization details
 * PUT  /api/v1/organizations/[id] - Update organization name
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, users, companies, organizations, organizationMembers } from '@schedulebox/database';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import {
  orgParamsSchema,
  updateOrganizationSchema,
  type OrgParams,
  type UpdateOrganizationInput,
} from '@/validations/organization';
import { nanoid } from 'nanoid';

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
 * Helper: verify user is a member of the organization (by org UUID)
 * Returns org internal details + membership info
 */
async function verifyOrgMembership(orgUuid: string, userId: number) {
  // Get organization by UUID
  const [org] = await db
    .select({
      id: organizations.id,
      uuid: organizations.uuid,
      name: organizations.name,
      slug: organizations.slug,
      maxLocations: organizations.maxLocations,
      isActive: organizations.isActive,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .where(eq(organizations.uuid, orgUuid))
    .limit(1);

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  // Verify user is a member
  const [membership] = await db
    .select({
      role: organizationMembers.role,
      companyId: organizationMembers.companyId,
    })
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.organizationId, org.id), eq(organizationMembers.userId, userId)),
    )
    .limit(1);

  if (!membership) {
    throw new ForbiddenError('You are not a member of this organization');
  }

  return { org, membership };
}

/**
 * GET /api/v1/organizations/[id]
 * Get organization details with locations and member count
 */
export const GET = createRouteHandler<undefined, OrgParams>({
  paramsSchema: orgParamsSchema,
  requiresAuth: true,
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    const { org } = await verifyOrgMembership(params.id, userId);

    // Get locations
    const locations = await db
      .select({
        company_uuid: companies.uuid,
        company_name: companies.name,
        company_slug: companies.slug,
        address_city: companies.addressCity,
        is_active: companies.isActive,
      })
      .from(companies)
      .where(eq(companies.organizationId, org.id));

    // Get member count
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, org.id));

    return successResponse({
      uuid: org.uuid,
      name: org.name,
      slug: org.slug,
      max_locations: org.maxLocations,
      is_active: org.isActive,
      created_at: org.createdAt,
      updated_at: org.updatedAt,
      locations,
      member_count: memberCount.count,
    });
  },
});

/**
 * PUT /api/v1/organizations/[id]
 * Update organization name (franchise_owner only)
 */
export const PUT = createRouteHandler<UpdateOrganizationInput, OrgParams>({
  paramsSchema: orgParamsSchema,
  bodySchema: updateOrganizationSchema,
  requiresAuth: true,
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    const { org, membership } = await verifyOrgMembership(params.id, userId);

    // Only franchise_owner can update org
    if (membership.role !== 'franchise_owner') {
      throw new ForbiddenError('Only franchise owners can update organization details');
    }

    // Regenerate slug if name changed
    const baseSlug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${nanoid(6)}`;

    // Update organization
    const [updated] = await db
      .update(organizations)
      .set({
        name: body.name,
        slug,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id))
      .returning();

    return successResponse({
      uuid: updated.uuid,
      name: updated.name,
      slug: updated.slug,
      max_locations: updated.maxLocations,
      is_active: updated.isActive,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    });
  },
});
