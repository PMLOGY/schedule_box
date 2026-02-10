/**
 * MFA Setup Endpoint
 * POST /api/v1/auth/mfa/setup
 *
 * Generates TOTP secret, QR code, and backup codes for MFA setup.
 * Requires authenticated user. MFA is NOT enabled until verified.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { successResponse } from '@/lib/utils/response.js';
import { setupMFA } from '@/lib/auth/mfa.js';
import { db, users } from '@schedulebox/database';
import { eq } from 'drizzle-orm';
import { UnauthorizedError } from '@schedulebox/shared';

export const POST = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Find user by UUID to get internal ID and email
    const [userRecord] = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.uuid, user.sub))
      .limit(1);

    if (!userRecord) {
      throw new UnauthorizedError('User not found');
    }

    // Setup MFA (generates secret, QR code, backup codes)
    const mfaData = await setupMFA(userRecord.id, userRecord.email);

    return successResponse({
      secret: mfaData.secret,
      qr_code_url: mfaData.qr_code_url,
      backup_codes: mfaData.backup_codes,
    });
  },
});
