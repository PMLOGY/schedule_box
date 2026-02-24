/**
 * Organization Member Management Endpoints
 * GET    /api/v1/organizations/[id]/members - List org members
 * POST   /api/v1/organizations/[id]/members - Add a member
 * DELETE /api/v1/organizations/[id]/members - Remove a member (body: { user_uuid })
 */

import { eq, and } from 'drizzle-orm';
import { db, users, companies, organizations, organizationMembers } from '@schedulebox/database';
import { ConflictError, ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse, createdResponse, noContentResponse } from '@/lib/utils/response';
import {
  orgParamsSchema,
  addMemberSchema,
  removeMemberSchema,
  type OrgParams,
  type AddMemberInput,
  type RemoveMemberInput,
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
      ownerUserId: organizations.ownerUserId,
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
 * GET /api/v1/organizations/[id]/members
 * List all members in the organization
 */
export const GET = createRouteHandler<undefined, OrgParams>({
  paramsSchema: orgParamsSchema,
  requiresAuth: true,
  handler: async ({ params, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    const { org } = await getOrgAndVerifyMembership(params.id, userId);

    // Query members joined with users and optionally companies
    const members = await db
      .select({
        user_uuid: users.uuid,
        user_name: users.name,
        user_email: users.email,
        role: organizationMembers.role,
        company_id: organizationMembers.companyId,
        created_at: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, org.id));

    // Enrich with company info for location_managers
    const companyIds = members
      .filter((m) => m.company_id !== null)
      .map((m) => m.company_id as number);

    let companyMap: Map<number, { uuid: string; name: string }> = new Map();
    if (companyIds.length > 0) {
      const companyRows = await db
        .select({
          id: companies.id,
          uuid: companies.uuid,
          name: companies.name,
        })
        .from(companies);

      companyMap = new Map(
        companyRows
          .filter((c) => companyIds.includes(c.id))
          .map((c) => [c.id, { uuid: c.uuid, name: c.name }]),
      );
    }

    const response = members.map((m) => {
      const company = m.company_id ? companyMap.get(m.company_id) : null;
      return {
        user_uuid: m.user_uuid,
        user_name: m.user_name,
        user_email: m.user_email,
        role: m.role,
        company_uuid: company?.uuid ?? null,
        company_name: company?.name ?? null,
        created_at: m.created_at,
      };
    });

    return successResponse(response);
  },
});

/**
 * POST /api/v1/organizations/[id]/members
 * Add a member to the organization (franchise_owner only)
 */
export const POST = createRouteHandler<AddMemberInput, OrgParams>({
  paramsSchema: orgParamsSchema,
  bodySchema: addMemberSchema,
  requiresAuth: true,
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    const { org, membership } = await getOrgAndVerifyMembership(params.id, userId);

    // Only franchise_owner can add members
    if (membership.role !== 'franchise_owner') {
      throw new ForbiddenError('Only franchise owners can manage members');
    }

    // If role is location_manager, company_uuid is required
    if (body.role === 'location_manager' && !body.company_uuid) {
      throw new ForbiddenError('company_uuid is required for location_manager role');
    }

    // If role is franchise_owner, ignore company_uuid (they get all-locations access)
    let companyId: number | null = null;

    if (body.role === 'location_manager' && body.company_uuid) {
      // Validate the company belongs to this org
      const [targetCompany] = await db
        .select({
          id: companies.id,
          organizationId: companies.organizationId,
        })
        .from(companies)
        .where(eq(companies.uuid, body.company_uuid))
        .limit(1);

      if (!targetCompany) {
        throw new NotFoundError('Location not found');
      }

      if (targetCompany.organizationId !== org.id) {
        throw new ForbiddenError('Location does not belong to this organization');
      }

      companyId = targetCompany.id;
    }

    // Find user by email
    const [targetUser] = await db
      .select({ id: users.id, uuid: users.uuid, name: users.name })
      .from(users)
      .where(eq(users.email, body.user_email))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundError('User with this email not found. They must register first.');
    }

    // Check if user is already a member of this org
    const [existingMembership] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, targetUser.id),
        ),
      )
      .limit(1);

    if (existingMembership) {
      throw new ConflictError('User is already a member of this organization');
    }

    // Insert member
    const [newMember] = await db
      .insert(organizationMembers)
      .values({
        organizationId: org.id,
        userId: targetUser.id,
        companyId,
        role: body.role,
      })
      .returning();

    return createdResponse({
      user_uuid: targetUser.uuid,
      user_name: targetUser.name,
      user_email: body.user_email,
      role: newMember.role,
      company_id: newMember.companyId,
      created_at: newMember.createdAt,
    });
  },
});

/**
 * DELETE /api/v1/organizations/[id]/members
 * Remove a member from the organization (franchise_owner only)
 * Body: { user_uuid: string }
 */
export const DELETE = createRouteHandler<RemoveMemberInput, OrgParams>({
  paramsSchema: orgParamsSchema,
  bodySchema: removeMemberSchema,
  requiresAuth: true,
  handler: async ({ params, body, user }) => {
    const userSub = user?.sub ?? '';
    const userId = await getUserInternalId(userSub);
    const { org, membership } = await getOrgAndVerifyMembership(params.id, userId);

    // Only franchise_owner can remove members
    if (membership.role !== 'franchise_owner') {
      throw new ForbiddenError('Only franchise owners can manage members');
    }

    // Find target user by UUID
    const [targetUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, body.user_uuid))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Cannot remove yourself (the org owner)
    if (targetUser.id === org.ownerUserId) {
      throw new ForbiddenError('Cannot remove the organization owner');
    }

    // Delete the membership record
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, targetUser.id),
        ),
      );

    return noContentResponse();
  },
});
