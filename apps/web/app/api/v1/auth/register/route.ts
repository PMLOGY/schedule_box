/**
 * POST /api/v1/auth/register
 * User registration with company creation (owner) or standalone customer registration
 *
 * Two flows:
 * - type='owner' (default): Creates a new company and its owner user in a transaction.
 * - type='customer': Creates a standalone customer user without a company.
 *
 * Returns JWT access and refresh tokens for immediate login.
 */

import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { db } from '@/lib/db/client';
import { companies, users, roles, passwordHistory } from '@schedulebox/database';
import { redis } from '@/lib/redis/client';
import { hashPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { registerSchema } from '@/validations/auth';
import { validateBody } from '@/lib/middleware/validate';
import { handleRouteError } from '@/lib/utils/errors';
import { createdResponse } from '@/lib/utils/response';
import { ConflictError } from '@schedulebox/shared';
import { sendEmailVerificationEmail } from '@/lib/email/auth-emails';

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

    // 2. Check if email already exists (for customers, check users without company)
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // Branch based on registration type
    if (input.type === 'customer') {
      return await registerCustomer(input);
    }

    return await registerOwner(input);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Register a customer user (no company creation)
 */
async function registerCustomer(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const result = await db.transaction(async (tx) => {
    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Find 'customer' role ID
    const [customerRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, 'customer'))
      .limit(1);

    if (!customerRole) {
      throw new Error('Customer role not found in database');
    }

    // Create user without company
    const [user] = await tx
      .insert(users)
      .values({
        companyId: null,
        roleId: customerRole.id,
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

    // Insert initial password into password history
    await tx.insert(passwordHistory).values({
      userId: user.id,
      passwordHash,
    });

    return { user, customerRole };
  });

  // Generate email verification token
  const verifyToken = nanoid(64);
  const verifyHash = createHash('sha256').update(verifyToken).digest('hex');
  await redis.setex(`email_verify:${verifyHash}`, 86400, result.user.id.toString());
  sendEmailVerificationEmail(result.user.email, verifyToken).catch((err) =>
    console.error('[Register] Failed to send verification email:', err),
  );

  // Generate JWT token pair (companyId = 0 for customer without company)
  const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
    result.user.id,
    result.user.uuid,
    0, // No company for customer
    result.customerRole.id,
    'customer',
    false,
  );

  return createdResponse({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    user: {
      uuid: result.user.uuid,
      email: result.user.email,
      name: result.user.name,
      role: 'customer',
      company_id: null,
    },
  });
}

/**
 * Register a business owner (creates company + user)
 */
async function registerOwner(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company_name?: string;
}) {
  // company_name is guaranteed by schema refinement for owner type
  const companyName = input.company_name!;

  const result = await db.transaction(async (tx) => {
    // Create company
    const slug = generateSlug(companyName);
    const [company] = await tx
      .insert(companies)
      .values({
        name: companyName,
        slug,
        email: input.email,
      })
      .returning({
        id: companies.id,
        uuid: companies.uuid,
      });

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Find 'owner' role ID
    const [ownerRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, 'owner'))
      .limit(1);

    if (!ownerRole) {
      throw new Error('Owner role not found in database');
    }

    // Create user
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

    // Insert initial password into password history
    await tx.insert(passwordHistory).values({
      userId: user.id,
      passwordHash,
    });

    return { company, user, ownerRole };
  });

  // Generate email verification token
  const verifyToken = nanoid(64);
  const verifyHash = createHash('sha256').update(verifyToken).digest('hex');
  await redis.setex(`email_verify:${verifyHash}`, 86400, result.user.id.toString());
  sendEmailVerificationEmail(result.user.email, verifyToken).catch((err) =>
    console.error('[Register] Failed to send verification email:', err),
  );

  // Generate JWT token pair
  const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
    result.user.id,
    result.user.uuid,
    result.company.id,
    result.ownerRole.id,
    'owner',
    false,
  );

  return createdResponse({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    user: {
      uuid: result.user.uuid,
      email: result.user.email,
      name: result.user.name,
      role: 'owner',
      company_id: result.company.uuid,
    },
  });
}
