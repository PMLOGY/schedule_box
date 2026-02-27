/**
 * Organization Locations Endpoints
 * GET  /api/v1/organizations/[id]/locations - List all locations in the org
 * POST /api/v1/organizations/[id]/locations - Add a new location
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, users, companies, organizations, organizationMembers } from '@schedulebox/database';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
} from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse, createdResponse } from '@/lib/utils/response';
import {
  orgParamsSchema,
  addLocationSchema,
  type OrgParams,
  type AddLocationInput,
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
 * Helper: get org by UUID and verify user membership
 */
async function getOrgAndVerifyMembership(orgUuid: string, userId: number) {
  const [org] = await db
    .select({
      id: organizations.id,
      uuid: organizations.uuid,
      name: organizations.name,
      maxLocations: organizations.maxLocations,
    })
    .from(organizations)
    .where(eq(organizations.uuid, orgUuid))
    .limit(1);

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  const [membership] = await db
    .select({
      role: organizationMembers.role,
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
 * GET /api/v1/organizations/[id]/locations
 * List all locations (companies) in the organization
 */
export const GET = createRouteHandler<undefined, OrgParams>({
  paramsSchema: orgParamsSchema,
  requiresAuth: true,
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    const { org } = await getOrgAndVerifyMembership(params.id, userId);

    // Query all companies belonging to this org
    const locations = await db
      .select({
        uuid: companies.uuid,
        name: companies.name,
        slug: companies.slug,
        email: companies.email,
        phone: companies.phone,
        address_street: companies.addressStreet,
        address_city: companies.addressCity,
        address_zip: companies.addressZip,
        is_active: companies.isActive,
        created_at: companies.createdAt,
      })
      .from(companies)
      .where(eq(companies.organizationId, org.id));

    return successResponse(locations);
  },
});

/**
 * POST /api/v1/organizations/[id]/locations
 * Add a new location to the organization (franchise_owner only)
 */
export const POST = createRouteHandler<AddLocationInput, OrgParams>({
  paramsSchema: orgParamsSchema,
  bodySchema: addLocationSchema,
  requiresAuth: true,
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    const { org, membership } = await getOrgAndVerifyMembership(params.id, userId);

    // Only franchise_owner can add locations
    if (membership.role !== 'franchise_owner') {
      throw new ForbiddenError('Only franchise owners can add locations');
    }

    // Check slug uniqueness across all companies
    const [existingSlug] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, body.slug))
      .limit(1);

    if (existingSlug) {
      throw new ConflictError('A company with this slug already exists');
    }

    // Count existing locations for this org
    const [locationCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies)
      .where(eq(companies.organizationId, org.id));

    if (locationCount.count >= (org.maxLocations ?? 1)) {
      throw new PaymentRequiredError(
        'Location limit reached for your plan. Upgrade to add more locations.',
      );
    }

    // Get owner's company subscription plan to assign to new location
    const [ownerCompany] = await db
      .select({ subscriptionPlan: companies.subscriptionPlan })
      .from(companies)
      .innerJoin(users, eq(users.companyId, companies.id))
      .where(eq(users.id, userId))
      .limit(1);

    const subscriptionPlan = ownerCompany?.subscriptionPlan ?? 'growth';

    // Insert new company as a location
    const [newLocation] = await db
      .insert(companies)
      .values({
        name: body.name,
        slug: body.slug,
        email: body.email,
        phone: body.phone ?? null,
        addressStreet: body.address_street ?? null,
        addressCity: body.address_city ?? null,
        addressZip: body.address_zip ?? null,
        organizationId: org.id,
        subscriptionPlan: subscriptionPlan as 'free' | 'essential' | 'growth' | 'ai_powered',
      })
      .returning();

    return createdResponse({
      uuid: newLocation.uuid,
      name: newLocation.name,
      slug: newLocation.slug,
      email: newLocation.email,
      phone: newLocation.phone,
      address_street: newLocation.addressStreet,
      address_city: newLocation.addressCity,
      address_zip: newLocation.addressZip,
      is_active: newLocation.isActive,
      created_at: newLocation.createdAt,
    });
  },
});
