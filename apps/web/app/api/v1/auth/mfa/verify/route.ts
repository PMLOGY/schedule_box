/**
 * MFA Verify Endpoint
 * POST /api/v1/auth/mfa/verify
 *
 * Verifies TOTP code and enables MFA on user account.
 * Requires authenticated user with MFA secret from setup.
 */

import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { mfaSetupVerifySchema } from '@/validations/auth';
import { enableMFA } from '@/lib/auth/mfa';
import { db, users } from '@schedulebox/database';
import { eq } from 'drizzle-orm';
import { UnauthorizedError, ValidationError } from '@schedulebox/shared';

export const POST = createRouteHandler({
  requiresAuth: true,
  bodySchema: mfaSetupVerifySchema,
  handler: async ({ user, body }) => {
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Find user by UUID to get internal ID
    const [userRecord] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.uuid, user.sub))
      .limit(1);

    if (!userRecord) {
      throw new UnauthorizedError('User not found');
    }

    // Enable MFA (verifies code and sets mfaEnabled=true)
    const success = await enableMFA(userRecord.id, body.code);

    if (!success) {
      throw new ValidationError('Invalid MFA code');
    }

    return successResponse({
      message: 'MFA enabled successfully',
    });
  },
});
