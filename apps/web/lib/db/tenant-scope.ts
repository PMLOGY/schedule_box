/**
 * Tenant-scoped query helpers
 * Resolves user UUID to company internal ID for multi-tenant CRUD operations
 */

import { eq } from 'drizzle-orm';
import { db, users, companies } from '@schedulebox/database';
import { UnauthorizedError } from '@schedulebox/shared';

/**
 * Find company ID and UUID for a given user
 *
 * This is THE canonical function used by all CRUD endpoints to resolve
 * company scope from JWT user UUID. Ensures user has an associated company
 * before allowing tenant-scoped operations.
 *
 * @param userUuid - User UUID from JWT payload (sub claim)
 * @returns Company internal ID (SERIAL) and UUID
 * @throws UnauthorizedError if user not found or has no associated company
 */
export async function findCompanyId(
  userUuid: string,
): Promise<{ companyId: number; companyUuid: string }> {
  // Query user by UUID
  const [user] = await db
    .select({
      companyId: users.companyId,
    })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .limit(1);

  // User must exist and have a company
  if (!user || !user.companyId) {
    throw new UnauthorizedError('User has no associated company');
  }

  // Query company UUID
  const [company] = await db
    .select({
      uuid: companies.uuid,
    })
    .from(companies)
    .where(eq(companies.id, user.companyId))
    .limit(1);

  if (!company) {
    throw new UnauthorizedError('User has no associated company');
  }

  return {
    companyId: user.companyId,
    companyUuid: company.uuid,
  };
}
