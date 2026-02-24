/**
 * Organization Endpoints
 * GET  /api/v1/organizations - Get user's organization with locations
 * POST /api/v1/organizations - Create a new organization
 */

import { eq, sql } from 'drizzle-orm';
import { db, users, companies, organizations, organizationMembers } from '@schedulebox/database';
import { ConflictError, PaymentRequiredError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { findOrganizationForUser } from '@/lib/db/org-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { createOrganizationSchema } from '@/validations/organization';
import { nanoid } from 'nanoid';

/**
 * GET /api/v1/organizations
 * Return the user's organization with all locations
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    const userSub = user?.sub ?? '';

    // Find user's organization membership
    const orgMembership = await findOrganizationForUser(userSub);

    if (!orgMembership) {
      return successResponse(null);
    }

    // Get organization details
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
      .where(eq(organizations.id, orgMembership.organizationId))
      .limit(1);

    if (!org) {
      return successResponse(null);
    }

    // Get all locations (companies) belonging to this org
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
 * POST /api/v1/organizations
 * Create a new organization. Only company owners on Growth or AI-Powered plans.
 */
export const POST = createRouteHandler({
  bodySchema: createOrganizationSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    const userSub = user?.sub ?? '';

    // Check if user already belongs to an organization
    const existingOrg = await findOrganizationForUser(userSub);
    if (existingOrg) {
      throw new ConflictError('User already belongs to an organization');
    }

    // Get user's internal ID and company
    const { companyId } = await findCompanyId(userSub);

    // Get user internal ID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userSub))
      .limit(1);

    if (!userRecord) {
      throw new ConflictError('User not found');
    }

    // Get company subscription plan
    const [company] = await db
      .select({
        subscriptionPlan: companies.subscriptionPlan,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new ConflictError('Company not found');
    }

    // Determine max_locations based on plan
    const plan = company.subscriptionPlan ?? 'free';
    let maxLocations: number;

    switch (plan) {
      case 'growth':
        maxLocations = 3;
        break;
      case 'ai_powered':
        maxLocations = 10;
        break;
      case 'free':
      case 'essential':
      default:
        throw new PaymentRequiredError('Multi-location requires Growth or AI-Powered plan');
    }

    // Generate slug from name
    const baseSlug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${nanoid(6)}`;

    // Create organization
    const [org] = await db
      .insert(organizations)
      .values({
        name: body.name,
        slug,
        ownerUserId: userRecord.id,
        maxLocations,
      })
      .returning();

    // Add user as franchise_owner (companyId = null = all locations access)
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: userRecord.id,
      companyId: null,
      role: 'franchise_owner',
    });

    // Update user's current company to belong to this org
    await db
      .update(companies)
      .set({
        organizationId: org.id,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    return createdResponse({
      uuid: org.uuid,
      name: org.name,
      slug: org.slug,
      max_locations: org.maxLocations,
      is_active: org.isActive,
      created_at: org.createdAt,
      updated_at: org.updatedAt,
    });
  },
});
