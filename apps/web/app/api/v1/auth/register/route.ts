/**
 * POST /api/v1/auth/register
 * User registration with company creation
 *
 * Creates a new company and its owner user in a transaction.
 * Returns JWT access and refresh tokens for immediate login.
 */

import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db/client';
import { companies, users, roles, passwordHistory } from '@schedulebox/database';
import { hashPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { registerSchema } from '@/validations/auth';
import { validateBody } from '@/lib/middleware/validate';
import { handleRouteError } from '@/lib/utils/errors';
import { createdResponse } from '@/lib/utils/response';
import { ConflictError } from '@schedulebox/shared';

/**
 * Generate URL-friendly slug from company name
 * - Lowercase
 * - Replace non-alphanumeric with hyphens
 * - Append random suffix for uniqueness
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  const suffix = nanoid(4);
  return `${base}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validate request body
    const input = await validateBody(registerSchema, req);

    // 2. Check if email already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // 3. Create company and user in transaction
    const result = await db.transaction(async (tx) => {
      // 3a. Create company
      const slug = generateSlug(input.company_name);
      const [company] = await tx
        .insert(companies)
        .values({
          name: input.company_name,
          slug,
          email: input.email,
        })
        .returning({
          id: companies.id,
          uuid: companies.uuid,
        });

      // 3b. Hash password
      const passwordHash = await hashPassword(input.password);

      // 3c. Find 'owner' role ID
      const [ownerRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, 'owner'))
        .limit(1);

      if (!ownerRole) {
        throw new Error('Owner role not found in database');
      }

      // 3d. Create user
      const [user] = await tx
        .insert(users)
        .values({
          companyId: company.id,
          roleId: ownerRole.id,
          email: input.email,
          passwordHash,
          name: input.name,
          phone: input.phone,
        })
        .returning({
          id: users.id,
          uuid: users.uuid,
          email: users.email,
          name: users.name,
        });

      // 3e. Insert initial password into password history
      await tx.insert(passwordHistory).values({
        userId: user.id,
        passwordHash,
      });

      return { company, user, ownerRole };
    });

    // 4. Generate JWT token pair
    const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
      result.user.id,
      result.user.uuid,
      result.company.id,
      result.ownerRole.id,
      'owner',
      false, // MFA not verified on registration
    );

    // 5. Return success with tokens
    return createdResponse({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      user: {
        uuid: result.user.uuid,
        email: result.user.email,
        name: result.user.name,
        role: 'owner',
        company_id: result.company.uuid, // Return company UUID, not internal ID
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
