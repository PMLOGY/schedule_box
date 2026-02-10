/**
 * Multi-Factor Authentication (MFA) utilities using TOTP
 *
 * Implements time-based one-time passwords (TOTP) with:
 * - Secret generation and storage
 * - QR code generation for authenticator apps
 * - Backup codes for account recovery
 * - MFA verification and enablement
 */

import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db, users } from '@schedulebox/database';

/**
 * Setup MFA for a user
 *
 * Generates TOTP secret, QR code URL, and backup codes.
 * Stores secret in user record but does NOT enable MFA yet.
 * MFA is only enabled after successful verification.
 *
 * @param userId - Internal user ID (SERIAL)
 * @param userEmail - User email for QR code label
 * @returns Secret, QR code data URL, and 10 backup codes
 */
export async function setupMFA(
  userId: number,
  userEmail: string,
): Promise<{
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}> {
  // Generate TOTP secret
  const secret = generateSecret();

  // Generate 10 backup codes (16 chars each, alphanumeric)
  const backupCodes = Array.from({ length: 10 }, () => nanoid(16));

  // Create otpauth URL for QR code
  const otpauthUrl = generateURI({
    issuer: 'ScheduleBox',
    label: userEmail,
    secret,
  });

  // Generate QR code as data URL
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  // Store secret in user record (but don't enable MFA yet)
  await db.update(users).set({ mfaSecret: secret }).where(eq(users.id, userId));

  return {
    secret,
    qr_code_url: qrCodeUrl,
    backup_codes: backupCodes,
  };
}

/**
 * Verify MFA code against secret
 *
 * @param secret - TOTP secret
 * @param code - 6-digit code from authenticator app
 * @returns true if code is valid, false otherwise
 */
export function verifyMFACode(secret: string, code: string): boolean {
  try {
    const result = verifySync({ token: code, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Enable MFA for a user after successful verification
 *
 * Fetches user's stored MFA secret, verifies the provided code,
 * and sets mfaEnabled=true if valid.
 *
 * @param userId - Internal user ID (SERIAL)
 * @param code - 6-digit code from authenticator app
 * @returns true if MFA was enabled, false if code was invalid
 */
export async function enableMFA(userId: number, code: string): Promise<boolean> {
  // Fetch user to get stored MFA secret
  const [user] = await db
    .select({
      mfaSecret: users.mfaSecret,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // User must have a secret from setup
  if (!user || !user.mfaSecret) {
    return false;
  }

  // Verify code against secret
  const isValid = verifyMFACode(user.mfaSecret, code);

  if (!isValid) {
    return false;
  }

  // Enable MFA on user account
  await db.update(users).set({ mfaEnabled: true }).where(eq(users.id, userId));

  return true;
}
