/**
 * GET /api/v1/auth/me - Get authenticated user profile
 * PUT /api/v1/auth/me - Update user profile
 *
 * Returns user details with company UUID (not internal ID)
 */

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client.js';
import { users, roles, companies } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { userUpdateSchema } from '@/validations/auth.js';
import { successResponse } from '@/lib/utils/response.js';
import { NotFoundError } from '@schedulebox/shared';

/**
 * GET /api/v1/auth/me
 * Return authenticated user profile
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    // Find user by UUID with role name and company UUID
    const [userRecord] = await db
      .select({
        uuid: users.uuid,
        email: users.email,
        name: users.name,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        roleName: roles.name,
        companyUuid: companies.uuid,
        mfaEnabled: users.mfaEnabled,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .innerJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.uuid, user!.sub))
      .limit(1);

    if (!userRecord) {
      throw new NotFoundError('User not found');
    }

    return successResponse({
      uuid: userRecord.uuid,
      email: userRecord.email,
      name: userRecord.name,
      phone: userRecord.phone ?? null,
      avatar_url: userRecord.avatarUrl ?? null,
      role: userRecord.roleName,
      company_id: userRecord.companyUuid, // Company UUID (not internal ID)
      mfa_enabled: userRecord.mfaEnabled ?? false,
      email_verified: userRecord.emailVerified ?? false,
      created_at: userRecord.createdAt.toISOString(),
    });
  },
});

/**
 * PUT /api/v1/auth/me
 * Update user profile (name, phone, avatar_url)
 */
export const PUT = createRouteHandler({
  requiresAuth: true,
  bodySchema: userUpdateSchema,
  handler: async ({ body, user }) => {
    // Find user by UUID to get internal userId
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, user!.sub))
      .limit(1);

    if (!userRecord) {
      throw new NotFoundError('User not found');
    }

    // Update user fields
    await db
      .update(users)
      .set({
        name: body.name,
        phone: body.phone,
        avatarUrl: body.avatar_url,
      })
      .where(eq(users.id, userRecord.id));

    // Fetch updated user profile with role name and company UUID
    const [updatedUser] = await db
      .select({
        uuid: users.uuid,
        email: users.email,
        name: users.name,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        roleName: roles.name,
        companyUuid: companies.uuid,
        mfaEnabled: users.mfaEnabled,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .innerJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.id, userRecord.id))
      .limit(1);

    return successResponse({
      uuid: updatedUser.uuid,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone ?? null,
      avatar_url: updatedUser.avatarUrl ?? null,
      role: updatedUser.roleName,
      company_id: updatedUser.companyUuid, // Company UUID (not internal ID)
      mfa_enabled: updatedUser.mfaEnabled ?? false,
      email_verified: updatedUser.emailVerified ?? false,
      created_at: updatedUser.createdAt.toISOString(),
    });
  },
});
