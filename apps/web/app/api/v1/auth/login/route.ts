/**
 * POST /api/v1/auth/login
 * User authentication with optional MFA verification
 *
 * Flow:
 * 1. Email/password verification
 * 2. If MFA enabled and no code provided → return mfa_required
 * 3. If MFA enabled and code provided → verify TOTP
 * 4. Generate tokens and set httpOnly cookie
 */

import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { verify as verifyTOTP } from 'otplib';
import { db } from '@/lib/db/client';
import { users, roles, companies } from '@schedulebox/database';
import { verifyPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { redis } from '@/lib/redis/client';
import { loginSchema } from '@/validations/auth';
import { handleRouteError } from '@/lib/utils/errors';
import { successResponse } from '@/lib/utils/response';
import { UnauthorizedError } from '@schedulebox/shared';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate request body
    const body = await req.json();
    const input = loginSchema.parse(body);

    // 2. Find user with role name and company UUID (JOIN roles and companies)
    const [userRecord] = await db
      .select({
        id: users.id,
        uuid: users.uuid,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
        mfaEnabled: users.mfaEnabled,
        mfaSecret: users.mfaSecret,
        emailVerified: users.emailVerified,
        companyId: users.companyId,
        companyUuid: companies.uuid,
        roleId: users.roleId,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .innerJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.email, input.email))
      .limit(1);

    // 3. Verify user exists and is active
    if (!userRecord) {
      // Generic message to prevent email enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!userRecord.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    if (!userRecord.companyId) {
      throw new UnauthorizedError('User is not associated with a company');
    }

    // 4. Verify password
    const isValidPassword = await verifyPassword(userRecord.passwordHash, input.password);
    if (!isValidPassword) {
      // TODO: Increment failed_login_count, lock account after 5 failures
      throw new UnauthorizedError('Invalid email or password');
    }

    // 5. Handle MFA flow
    if (userRecord.mfaEnabled) {
      if (!input.mfa_code) {
        // MFA required but code not provided → return challenge
        const mfaToken = nanoid(32);
        await redis.setex(`mfa:${mfaToken}`, 300, userRecord.id.toString()); // 5 min TTL

        return successResponse({
          mfa_required: true,
          mfa_token: mfaToken,
        });
      }

      // MFA code provided → verify TOTP
      // NOTE: Plan 03-05 will create lib/auth/mfa.ts with verifyMFACode() helper.
      // For now, inline otplib usage is correct and self-contained.
      if (!userRecord.mfaSecret) {
        throw new UnauthorizedError('MFA is enabled but secret is missing');
      }

      const isValidMFA = await verifyTOTP({
        token: input.mfa_code,
        secret: userRecord.mfaSecret,
      });

      if (!isValidMFA) {
        throw new UnauthorizedError('Invalid MFA code');
      }
    }

    // 6. Generate JWT token pair
    const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
      userRecord.id,
      userRecord.uuid,
      userRecord.companyId,
      userRecord.roleId,
      userRecord.roleName,
      userRecord.mfaEnabled ?? false, // mfa_verified = true if MFA was verified
    );

    // 7. Update last login timestamp
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userRecord.id));

    // 8. Return success with tokens and set httpOnly cookie
    const response = NextResponse.json({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        user: {
          uuid: userRecord.uuid,
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.roleName,
          company_id: userRecord.companyUuid, // Company UUID (not internal ID)
          mfa_enabled: userRecord.mfaEnabled ?? false,
          email_verified: userRecord.emailVerified ?? false,
        },
      },
    });

    // Set refresh token as httpOnly cookie
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/api/v1/auth/refresh',
    });

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
