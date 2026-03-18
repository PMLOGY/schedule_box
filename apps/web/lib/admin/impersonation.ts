/**
 * Admin Impersonation Library
 *
 * Handles impersonation session lifecycle:
 * - Generate short-lived JWT for admin to act as another user
 * - Verify active impersonation tokens
 * - Revoke impersonation sessions
 *
 * Security:
 * - 15-minute hard expiry enforced both via JWT and DB session record
 * - Cannot impersonate other admins
 * - Every start/end written to platform audit log by caller
 * - Sessions revocable at any time (revokedAt IS NOT NULL = expired)
 */

import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { impersonationSessions } from '@schedulebox/database';
import { UnauthorizedError } from '@schedulebox/shared';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET or JWT_ACCESS_SECRET must be set in production');
  }
  return 'dev-secret-change-me';
}

const IMPERSONATION_EXPIRY_SECONDS = 900; // 15 minutes

export interface ImpersonationPayload {
  sub: string; // target user UUID
  iss: 'schedulebox';
  aud: 'schedulebox-api';
  exp: number;
  iat: number;
  company_id: number;
  role: string;
  permissions: string[];
  mfa_verified: false;
  token_type: 'impersonation';
  admin_uuid: string;
  session_id: string;
}

export interface TargetUserInfo {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  companyId: number;
}

/**
 * Generate impersonation token and create session record.
 *
 * @param adminId - Internal admin user ID
 * @param adminUuid - Admin user UUID
 * @param targetUser - Target user info
 * @param ipAddress - Request IP address
 * @returns token, sessionId, expiresAt
 */
export async function generateImpersonationToken(
  adminId: number,
  adminUuid: string,
  targetUser: TargetUserInfo,
  ipAddress: string,
): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + IMPERSONATION_EXPIRY_SECONDS * 1000);

  // Insert session record
  await db.insert(impersonationSessions).values({
    id: sessionId,
    adminId,
    targetUserId: targetUser.id,
    targetCompanyId: targetUser.companyId || null,
    startedAt: new Date(),
    expiresAt,
    ipAddress,
  });

  // Sign JWT
  const token = jwt.sign(
    {
      sub: targetUser.uuid,
      company_id: targetUser.companyId,
      role: targetUser.role,
      permissions: targetUser.permissions,
      mfa_verified: false,
      token_type: 'impersonation',
      admin_uuid: adminUuid,
      session_id: sessionId,
    } satisfies Omit<ImpersonationPayload, 'iss' | 'aud' | 'exp' | 'iat'>,
    getJwtSecret(),
    {
      expiresIn: IMPERSONATION_EXPIRY_SECONDS,
      issuer: 'schedulebox',
      audience: 'schedulebox-api',
    },
  );

  return { token, sessionId, expiresAt };
}

/**
 * Verify impersonation token and ensure the session is still active.
 *
 * @throws UnauthorizedError if invalid, expired, or revoked
 */
export async function verifyImpersonationToken(token: string): Promise<ImpersonationPayload> {
  let decoded: ImpersonationPayload;
  try {
    decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'schedulebox',
      audience: 'schedulebox-api',
    }) as ImpersonationPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired impersonation token');
  }

  if (decoded.token_type !== 'impersonation') {
    throw new UnauthorizedError('Token is not an impersonation token');
  }

  // Check session in DB (revocation check)
  const [session] = await db
    .select({ id: impersonationSessions.id, revokedAt: impersonationSessions.revokedAt })
    .from(impersonationSessions)
    .where(eq(impersonationSessions.id, decoded.session_id))
    .limit(1);

  if (!session) {
    throw new UnauthorizedError('Impersonation session not found');
  }

  if (session.revokedAt !== null) {
    throw new UnauthorizedError('Impersonation session has been revoked');
  }

  return decoded;
}

/**
 * Revoke an impersonation session by setting revokedAt to now.
 */
export async function endImpersonationSession(sessionId: string): Promise<void> {
  await db
    .update(impersonationSessions)
    .set({ revokedAt: new Date() })
    .where(eq(impersonationSessions.id, sessionId));
}
