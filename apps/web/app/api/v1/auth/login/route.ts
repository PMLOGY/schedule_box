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
import { validateBody } from '@/lib/middleware/validate';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { handleRouteError } from '@/lib/utils/errors';
import { successResponse } from '@/lib/utils/response';
import { UnauthorizedError } from '@schedulebox/shared';

const LOGIN_LOCKOUT_THRESHOLD = 5; // Lock after 5 failed attempts
const LOGIN_LOCKOUT_SECONDS = 900; // 15-minute lockout
const MFA_MAX_ATTEMPTS = 3; // Max MFA attempts per token

export async function POST(req: NextRequest) {
  try {
    // 0. Rate limit login attempts (10 per 15 minutes per IP)
    await checkRateLimit(req, RATE_LIMITS.AUTH_SENSITIVE, 'auth:login');

    // 1. Validate request body
    const input = await validateBody(loginSchema, req);

    // 1.5. Check account lockout before expensive password verification
    const lockoutKey = `login_lockout:${input.email}`;
    try {
      const isLocked = await redis.get(lockoutKey);
      if (isLocked) {
        const ttl = await redis.ttl(lockoutKey);
        const minutes = ttl > 0 ? Math.ceil(ttl / 60) : 15;
        throw new UnauthorizedError(
          `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minutes.`,
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      console.error('[Login] Redis lockout check failed, skipping:', (error as Error).message);
    }

    // 2. Find user with role name and company UUID (LEFT JOIN companies for superadmins)
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
      .leftJoin(companies, eq(users.companyId, companies.id))
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

    // 4. Verify password
    const isValidPassword = await verifyPassword(userRecord.passwordHash, input.password);
    if (!isValidPassword) {
      // Increment failed login counter and lock after threshold
      try {
        const failKey = `login_failures:${input.email}`;
        const failures = await redis.incr(failKey);
        if (failures === 1) {
          await redis.expire(failKey, LOGIN_LOCKOUT_SECONDS);
        }
        if (failures >= LOGIN_LOCKOUT_THRESHOLD) {
          await redis.setex(lockoutKey, LOGIN_LOCKOUT_SECONDS, '1');
          await redis.del(failKey);
          throw new UnauthorizedError(
            'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.',
          );
        }
      } catch (error) {
        if (error instanceof UnauthorizedError) throw error;
        console.error(
          '[Login] Redis lockout increment failed, skipping:',
          (error as Error).message,
        );
      }
      throw new UnauthorizedError('Invalid email or password');
    }

    // Clear failed login counter on successful password verification
    try {
      await redis.del(`login_failures:${input.email}`);
    } catch {
      // Redis unavailable - no-op
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

      // MFA code provided → verify TOTP with attempt limiting
      if (!userRecord.mfaSecret) {
        throw new UnauthorizedError('MFA is enabled but secret is missing');
      }

      // Check MFA attempt counter (max 3 per token)
      const mfaAttemptKey = `mfa_attempts:${input.mfa_token}`;
      const mfaAttempts = await redis.incr(mfaAttemptKey);
      if (mfaAttempts === 1) {
        await redis.expire(mfaAttemptKey, 300); // Same TTL as MFA token
      }
      if (mfaAttempts > MFA_MAX_ATTEMPTS) {
        // Expire the MFA token to force re-authentication
        if (input.mfa_token) {
          await redis.del(`mfa:${input.mfa_token}`);
        }
        await redis.del(mfaAttemptKey);
        throw new UnauthorizedError('Too many MFA attempts. Please log in again.');
      }

      const isValidMFA = await verifyTOTP({
        token: input.mfa_code,
        secret: userRecord.mfaSecret,
      });

      if (!isValidMFA) {
        throw new UnauthorizedError('Invalid MFA code');
      }

      // Clean up MFA attempt counter on success
      await redis.del(mfaAttemptKey);
    }

    // 6. Ensure user has a company (superadmins bypass this check)
    if (!userRecord.companyId && userRecord.roleName !== 'admin') {
      throw new UnauthorizedError('User is not associated with a company');
    }

    // 6.5. Check if company is suspended (non-admin users only)
    if (userRecord.companyId && userRecord.roleName !== 'admin') {
      const [companyRecord] = await db
        .select({ suspendedAt: companies.suspendedAt, suspendedReason: companies.suspendedReason })
        .from(companies)
        .where(eq(companies.id, userRecord.companyId))
        .limit(1);

      if (companyRecord?.suspendedAt) {
        return NextResponse.json(
          {
            error: {
              code: 'COMPANY_SUSPENDED',
              message: `Ucet byl pozastaven: ${companyRecord.suspendedReason ?? 'Kontaktujte podporu'}`,
            },
          },
          { status: 403 },
        );
      }
    }

    // 7. Generate JWT token pair
    const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
      userRecord.id,
      userRecord.uuid,
      userRecord.companyId ?? 0,
      userRecord.roleId,
      userRecord.roleName,
      userRecord.mfaEnabled ?? false, // mfa_verified = true if MFA was verified
    );

    // 8. Update last login timestamp
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userRecord.id));

    // 9. Return success with tokens and set httpOnly cookie
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
