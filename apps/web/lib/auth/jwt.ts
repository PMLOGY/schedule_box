/**
 * JWT token generation, verification, rotation, and blacklisting
 *
 * Security:
 * - Access tokens: 15-min expiry with user claims
 * - Refresh tokens: 64-char random strings, SHA-256 hashed in DB
 * - Token rotation: SELECT FOR UPDATE prevents race conditions
 * - Blacklist: Redis with TTL matching JWT remaining lifetime
 */
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { redis } from '../redis/client';
import { db, dbTx } from '../db/client';
import { refreshTokens, rolePermissions, permissions, users, roles } from '@schedulebox/database';
import { UnauthorizedError } from '@schedulebox/shared';

// JWT Configuration — lazy to avoid crash during next build
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET or JWT_ACCESS_SECRET must be set in production');
  }
  return 'dev-secret-change-me';
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

/**
 * JWT payload structure matching documentation section 25.1
 */
export interface JWTPayload {
  sub: string; // User UUID
  iss: 'schedulebox';
  aud: 'schedulebox-api';
  exp: number;
  iat: number;
  company_id: number;
  role: string;
  permissions: string[];
  mfa_verified: boolean;
}

/**
 * Hash refresh token with SHA-256 for storage
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate JWT access + refresh token pair
 *
 * Access token contains user claims for authorization.
 * Refresh token is random string hashed and stored in DB.
 */
export async function generateTokenPair(
  userId: number,
  userUuid: string,
  companyId: number,
  roleId: number,
  roleName: string,
  mfaVerified: boolean,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  // Fetch permissions for role
  const rolePerms = await db
    .select({
      name: permissions.name,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  const permissionNames = rolePerms.map((p) => p.name);

  // Sign access token
  const accessToken = jwt.sign(
    {
      sub: userUuid,
      company_id: companyId,
      role: roleName,
      permissions: permissionNames,
      mfa_verified: mfaVerified,
    } satisfies Omit<JWTPayload, 'iss' | 'aud' | 'exp' | 'iat'>,
    getJwtSecret(),
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'schedulebox',
      audience: 'schedulebox-api',
    },
  );

  // Generate refresh token
  const refreshToken = nanoid(64);
  const tokenHash = hashToken(refreshToken);

  // Store refresh token in DB
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
    revoked: false,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

/**
 * Verify JWT access token
 *
 * Checks Redis blacklist first, then verifies signature and claims.
 *
 * @throws UnauthorizedError if token is invalid, expired, or blacklisted
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    // Check blacklist first
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Verify token signature and claims
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'schedulebox',
      audience: 'schedulebox-api',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    // jwt.verify throws on invalid/expired tokens
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Rotate refresh token (exchange old for new token pair)
 *
 * Uses SELECT FOR UPDATE to prevent race conditions when same token
 * is used concurrently (see research pitfall #2).
 *
 * @throws UnauthorizedError if token is invalid, revoked, or expired
 */
export async function rotateRefreshToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const tokenHash = hashToken(refreshToken);

  return await dbTx.transaction(async (tx) => {
    // Lock the refresh token row to prevent concurrent rotation
    const [tokenRecord] = await tx
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        expiresAt: refreshTokens.expiresAt,
        revoked: refreshTokens.revoked,
      })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .for('update');

    // Validate token
    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    if (tokenRecord.revoked) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // Revoke old token
    await tx
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, tokenRecord.id));

    // Fetch user details for new token
    const [user] = await tx
      .select({
        id: users.id,
        uuid: users.uuid,
        companyId: users.companyId,
        roleId: users.roleId,
        roleName: roles.name,
        mfaEnabled: users.mfaEnabled,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, tokenRecord.userId));

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Generate new token pair
    // companyId ?? 0 handles admin and customer users who have no company
    const newTokenPair = await generateTokenPair(
      user.id,
      user.uuid,
      user.companyId ?? 0,
      user.roleId,
      user.roleName,
      user.mfaEnabled ?? false,
    );

    return newTokenPair;
  });
}

/**
 * Blacklist JWT access token in Redis
 *
 * Sets TTL to match token's remaining lifetime so it auto-expires
 * when the token would have expired anyway.
 */
export async function blacklistToken(token: string): Promise<void> {
  try {
    // Decode token without verification to get expiry
    const decoded = jwt.decode(token) as JWTPayload | null;

    if (!decoded || !decoded.exp) {
      // Invalid token format, ignore
      return;
    }

    // Calculate remaining TTL in seconds
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    // Only blacklist if token hasn't expired yet
    if (ttl > 0) {
      await redis.setex(`blacklist:${token}`, ttl, '1');
    }
  } catch (error) {
    // Ignore errors during blacklisting (token might be malformed)
    console.error('[JWT] Blacklist error:', error);
  }
}
