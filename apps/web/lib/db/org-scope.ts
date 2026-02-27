/**
 * Organization-scoped query helpers
 * Resolves user to their organization and validates multi-location access
 *
 * Follows the pattern of tenant-scope.ts but operates at the organization level
 * for multi-location scenarios (franchise owners, location managers).
 */

import { eq, and } from 'drizzle-orm';
import { db } from './client';
import { users, companies, organizations, organizationMembers, roles } from '@schedulebox/database';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';

/**
 * Find the organization a user belongs to (via organization_members).
 * Returns null if user is not part of any organization.
 */
export async function findOrganizationForUser(userUuid: string): Promise<{
  organizationId: number;
  organizationUuid: string;
  organizationName: string;
  orgRole: string;
  companyId: number | null; // null = all locations
} | null> {
  // First get user's internal ID
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .limit(1);

  if (!user) return null;

  // Find org membership
  const [membership] = await db
    .select({
      organizationId: organizationMembers.organizationId,
      organizationUuid: organizations.uuid,
      organizationName: organizations.name,
      orgRole: organizationMembers.role,
      companyId: organizationMembers.companyId,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);

  return membership ?? null;
}

/**
 * Get all company IDs belonging to an organization.
 * Used for cross-location queries (org dashboard, customer dedup).
 */
export async function findOrganizationCompanyIds(organizationId: number): Promise<number[]> {
  const rows = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.organizationId, organizationId), eq(companies.isActive, true)));
  return rows.map((r) => r.id);
}

/**
 * Validate that a user can switch to a target company.
 *
 * Rules:
 * - Target company must belong to the same organization as the user
 * - franchise_owner: can switch to any company in the org
 * - location_manager: can only access their assigned company (companyId in org_members)
 *
 * @throws ForbiddenError if access denied
 * @throws NotFoundError if target company doesn't exist
 */
export async function validateLocationAccess(
  userUuid: string,
  targetCompanyUuid: string,
): Promise<{
  userId: number;
  userInternalId: number;
  roleId: number;
  roleName: string;
  targetCompanyId: number;
  organizationId: number;
  mfaVerified: boolean;
}> {
  // 1. Look up user by UUID, get internal ID, roleId, roleName, mfaEnabled
  const [user] = await db
    .select({
      id: users.id,
      uuid: users.uuid,
      roleId: users.roleId,
      roleName: roles.name,
      mfaEnabled: users.mfaEnabled,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.uuid, userUuid))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // 2. Look up target company by UUID, get id and organizationId
  const [targetCompany] = await db
    .select({
      id: companies.id,
      name: companies.name,
      organizationId: companies.organizationId,
    })
    .from(companies)
    .where(eq(companies.uuid, targetCompanyUuid))
    .limit(1);

  if (!targetCompany) {
    throw new NotFoundError('Target company not found');
  }

  // 3. Verify target company has an organizationId (not a standalone company)
  if (!targetCompany.organizationId) {
    throw new ForbiddenError('Company is not part of an organization');
  }

  // 4. Find user's organization_members record for the target company's organization
  const [membership] = await db
    .select({
      organizationId: organizationMembers.organizationId,
      companyId: organizationMembers.companyId,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.organizationId, targetCompany.organizationId),
      ),
    )
    .limit(1);

  // 5. If no membership found, user is not part of target company's organization
  if (!membership) {
    throw new ForbiddenError('You do not have access to this location');
  }

  // 6. If role is location_manager and companyId is set, verify it matches target
  if (
    membership.role === 'location_manager' &&
    membership.companyId !== null &&
    membership.companyId !== targetCompany.id
  ) {
    throw new ForbiddenError('You do not have access to this location');
  }

  // 7. Return all needed data for token generation
  return {
    userId: user.id,
    userInternalId: user.id,
    roleId: user.roleId,
    roleName: user.roleName,
    targetCompanyId: targetCompany.id,
    organizationId: targetCompany.organizationId,
    mfaVerified: user.mfaEnabled ?? false,
  };
}
