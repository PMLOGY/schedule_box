/**
 * Integration Tests: Multi-Location Switch Security
 *
 * Validates that cross-organization location switching is properly rejected
 * and that role-based access (franchise_owner vs location_manager) is enforced.
 *
 * These tests verify the security boundary logic that validateLocationAccess
 * implements by seeding organizations, companies, users, and memberships,
 * then checking access rules directly via DB queries.
 *
 * Test scenario:
 * - Org A: Company A1, Company A2
 * - Org B: Company B1
 * - User1: franchise_owner of Org A (all locations)
 * - User2: location_manager of Org A scoped to Company A1
 * - User3: franchise_owner of Org B
 */

import { inject } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as schema from '@schedulebox/database';
import {
  seedCompany,
  seedUser,
  seedRole,
  seedOrganization,
  seedOrganizationMember,
} from '../helpers/seed-helpers';
import { truncateAllTables } from '../helpers/test-db';

// ============================================================================
// Test state
// ============================================================================

let superClient: postgres.Sql;
let superDb: ReturnType<typeof drizzle<typeof schema>>;

// Roles
let ownerRoleId: number;

// Org A
let orgA: typeof schema.organizations.$inferSelect;
let companyA1: typeof schema.companies.$inferSelect;
let companyA2: typeof schema.companies.$inferSelect;

// Org B
let orgB: typeof schema.organizations.$inferSelect;
let companyB1: typeof schema.companies.$inferSelect;

// Standalone company (no organization)
let standaloneCompany: typeof schema.companies.$inferSelect;

// Users
let user1: typeof schema.users.$inferSelect; // franchise_owner of Org A
let user2: typeof schema.users.$inferSelect; // location_manager of Org A -> A1
let user3: typeof schema.users.$inferSelect; // franchise_owner of Org B

// ============================================================================
// Inline validateLocationAccess using test DB
// ============================================================================

/**
 * Re-implements validateLocationAccess using the test DB connection.
 * Returns the same result shape or throws the same error types.
 */
async function testValidateLocationAccess(
  db: ReturnType<typeof drizzle<typeof schema>>,
  userUuid: string,
  targetCompanyUuid: string,
): Promise<{
  userId: number;
  roleId: number;
  roleName: string;
  targetCompanyId: number;
  organizationId: number;
  mfaVerified: boolean;
}> {
  // 1. Look up user
  const [user] = await db
    .select({
      id: schema.users.id,
      roleId: schema.users.roleId,
      roleName: schema.roles.name,
      mfaEnabled: schema.users.mfaEnabled,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(eq(schema.users.uuid, userUuid))
    .limit(1);

  if (!user) {
    throw new Error('NOT_FOUND: User not found');
  }

  // 2. Look up target company
  const [targetCompany] = await db
    .select({
      id: schema.companies.id,
      organizationId: schema.companies.organizationId,
    })
    .from(schema.companies)
    .where(eq(schema.companies.uuid, targetCompanyUuid))
    .limit(1);

  if (!targetCompany) {
    throw new Error('NOT_FOUND: Target company not found');
  }

  // 3. Check company has organization
  if (!targetCompany.organizationId) {
    throw new Error('FORBIDDEN: Company is not part of an organization');
  }

  // 4. Check user's org membership
  const [membership] = await db
    .select({
      organizationId: schema.organizationMembers.organizationId,
      companyId: schema.organizationMembers.companyId,
      role: schema.organizationMembers.role,
    })
    .from(schema.organizationMembers)
    .where(
      and(
        eq(schema.organizationMembers.userId, user.id),
        eq(schema.organizationMembers.organizationId, targetCompany.organizationId),
      ),
    )
    .limit(1);

  // 5. No membership = cross-org rejection
  if (!membership) {
    throw new Error('FORBIDDEN: You do not have access to this location');
  }

  // 6. Location manager scope check
  if (
    membership.role === 'location_manager' &&
    membership.companyId !== null &&
    membership.companyId !== targetCompany.id
  ) {
    throw new Error('FORBIDDEN: You do not have access to this location');
  }

  return {
    userId: user.id,
    roleId: user.roleId,
    roleName: user.roleName,
    targetCompanyId: targetCompany.id,
    organizationId: targetCompany.organizationId,
    mfaVerified: user.mfaEnabled ?? false,
  };
}

// ============================================================================
// Suite setup / teardown
// ============================================================================

beforeAll(async () => {
  if (process.env.SKIP_DOCKER === 'true') return; // no containers — skip setup
  superClient = postgres(inject('DATABASE_URL'), { max: 5 });
  superDb = drizzle(superClient, { schema });

  await truncateAllTables(superClient);

  // Seed the 'owner' role (needed for user creation)
  const role = await seedRole(superDb, {
    name: 'owner',
    description: 'Company owner',
  });
  ownerRoleId = role.id;

  const ts = Date.now();

  // ── Org A with Company A1 and A2 ───────────────────────────────────────

  // Create companies first (needed before org)
  companyA1 = await seedCompany(superDb, {
    name: 'Org A - Location 1',
    slug: `org-a-loc-1-${ts}`,
    email: `a1-${ts}@example.com`,
  });

  companyA2 = await seedCompany(superDb, {
    name: 'Org A - Location 2',
    slug: `org-a-loc-2-${ts}`,
    email: `a2-${ts}@example.com`,
  });

  // Create User1 (franchise_owner of Org A)
  user1 = await seedUser(superDb, {
    companyId: companyA1.id,
    roleId: ownerRoleId,
    name: 'Franchise Owner A',
    email: `franchise-a-${ts}@test.com`,
  });

  // Create Org A
  orgA = await seedOrganization(superDb, {
    name: 'Organization Alpha',
    slug: `org-alpha-${ts}`,
    ownerUserId: user1.id,
  });

  // Assign companies to Org A
  await superClient.unsafe(
    `UPDATE companies SET organization_id = ${orgA.id} WHERE id IN (${companyA1.id}, ${companyA2.id})`,
  );

  // Refresh company objects to get updated organizationId
  const [a1] = await superDb
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, companyA1.id));
  companyA1 = a1;
  const [a2] = await superDb
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, companyA2.id));
  companyA2 = a2;

  // User1 = franchise_owner of Org A (companyId = null -> all locations)
  await seedOrganizationMember(superDb, {
    organizationId: orgA.id,
    userId: user1.id,
    companyId: null,
    role: 'franchise_owner',
  });

  // User2 = location_manager of Org A scoped to Company A1
  user2 = await seedUser(superDb, {
    companyId: companyA1.id,
    roleId: ownerRoleId,
    name: 'Location Manager A1',
    email: `manager-a1-${ts}@test.com`,
  });

  await seedOrganizationMember(superDb, {
    organizationId: orgA.id,
    userId: user2.id,
    companyId: companyA1.id,
    role: 'location_manager',
  });

  // ── Org B with Company B1 ─────────────────────────────────────────────

  companyB1 = await seedCompany(superDb, {
    name: 'Org B - Location 1',
    slug: `org-b-loc-1-${ts}`,
    email: `b1-${ts}@example.com`,
  });

  user3 = await seedUser(superDb, {
    companyId: companyB1.id,
    roleId: ownerRoleId,
    name: 'Franchise Owner B',
    email: `franchise-b-${ts}@test.com`,
  });

  orgB = await seedOrganization(superDb, {
    name: 'Organization Beta',
    slug: `org-beta-${ts}`,
    ownerUserId: user3.id,
  });

  await superClient.unsafe(
    `UPDATE companies SET organization_id = ${orgB.id} WHERE id = ${companyB1.id}`,
  );

  const [b1] = await superDb
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, companyB1.id));
  companyB1 = b1;

  await seedOrganizationMember(superDb, {
    organizationId: orgB.id,
    userId: user3.id,
    companyId: null,
    role: 'franchise_owner',
  });

  // ── Standalone company (no organization) ───────────────────────────────

  standaloneCompany = await seedCompany(superDb, {
    name: 'Standalone Company',
    slug: `standalone-${ts}`,
    email: `standalone-${ts}@example.com`,
  });
});

afterAll(async () => {
  await superClient?.end();
});

// ============================================================================
// Tests: franchise_owner access
// ============================================================================

describe.skipIf(process.env.SKIP_DOCKER === 'true')('Switch Location — franchise_owner', () => {
  it('CAN switch within their organization (A1 -> A2)', async () => {
    const result = await testValidateLocationAccess(superDb, user1.uuid, companyA2.uuid);

    expect(result.targetCompanyId).toBe(companyA2.id);
    expect(result.organizationId).toBe(orgA.id);
    expect(result.userId).toBe(user1.id);
  });

  it('CAN switch to any company in their org (A2 -> A1)', async () => {
    const result = await testValidateLocationAccess(superDb, user1.uuid, companyA1.uuid);

    expect(result.targetCompanyId).toBe(companyA1.id);
    expect(result.organizationId).toBe(orgA.id);
  });

  it('CANNOT switch to company in different org (Org A -> Org B)', async () => {
    await expect(testValidateLocationAccess(superDb, user1.uuid, companyB1.uuid)).rejects.toThrow(
      'FORBIDDEN',
    );
  });
});

// ============================================================================
// Tests: location_manager access
// ============================================================================

describe.skipIf(process.env.SKIP_DOCKER === 'true')('Switch Location — location_manager', () => {
  it('CAN access their assigned location (A1)', async () => {
    const result = await testValidateLocationAccess(superDb, user2.uuid, companyA1.uuid);

    expect(result.targetCompanyId).toBe(companyA1.id);
    expect(result.organizationId).toBe(orgA.id);
  });

  it('CANNOT switch to unassigned location in same org (A1 -> A2)', async () => {
    await expect(testValidateLocationAccess(superDb, user2.uuid, companyA2.uuid)).rejects.toThrow(
      'FORBIDDEN',
    );
  });

  it('CANNOT switch to company in different org', async () => {
    await expect(testValidateLocationAccess(superDb, user2.uuid, companyB1.uuid)).rejects.toThrow(
      'FORBIDDEN',
    );
  });
});

// ============================================================================
// Tests: cross-org rejection
// ============================================================================

describe.skipIf(process.env.SKIP_DOCKER === 'true')('Switch Location — cross-org rejection', () => {
  it('User from Org B CANNOT access Org A company', async () => {
    await expect(testValidateLocationAccess(superDb, user3.uuid, companyA1.uuid)).rejects.toThrow(
      'FORBIDDEN',
    );
  });

  it('User from Org B CANNOT access Org A second location', async () => {
    await expect(testValidateLocationAccess(superDb, user3.uuid, companyA2.uuid)).rejects.toThrow(
      'FORBIDDEN',
    );
  });
});

// ============================================================================
// Tests: edge cases
// ============================================================================

describe.skipIf(process.env.SKIP_DOCKER === 'true')('Switch Location — edge cases', () => {
  it('Switch to non-existent company returns NOT_FOUND', async () => {
    const fakeUuid = '00000000-0000-4000-8000-000000000000';
    await expect(testValidateLocationAccess(superDb, user1.uuid, fakeUuid)).rejects.toThrow(
      'NOT_FOUND',
    );
  });

  it('Switch to company without organization returns FORBIDDEN', async () => {
    await expect(
      testValidateLocationAccess(superDb, user1.uuid, standaloneCompany.uuid),
    ).rejects.toThrow('FORBIDDEN');
  });

  it('Non-existent user returns NOT_FOUND', async () => {
    const fakeUserUuid = '00000000-0000-4000-8000-000000000001';
    await expect(testValidateLocationAccess(superDb, fakeUserUuid, companyA1.uuid)).rejects.toThrow(
      'NOT_FOUND',
    );
  });
});
