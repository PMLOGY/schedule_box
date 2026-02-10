/**
 * POST /api/v1/auth/change-password
 * Change password for authenticated user
 *
 * Actions:
 * 1. Verify current password
 * 2. Check password history to prevent reuse
 * 3. Update password
 * 4. Revoke all refresh tokens (force re-login)
 * 5. Blacklist current access token
 */

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users, refreshTokens } from '@schedulebox/database';
import { verifyPassword, checkPasswordHistory, updatePassword } from '@/lib/auth/password';
import { blacklistToken } from '@/lib/auth/jwt';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { changePasswordSchema } from '@/validations/auth';
import { successResponse } from '@/lib/utils/response';
import { UnauthorizedError, ValidationError } from '@schedulebox/shared';

export const POST = createRouteHandler({
  requiresAuth: true,
  bodySchema: changePasswordSchema,
  handler: async ({ req, body, user }) => {
    // 1. Find user by UUID to get internal userId and passwordHash
    const [userRecord] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.uuid, user!.sub))
      .limit(1);

    if (!userRecord) {
      throw new UnauthorizedError('User not found');
    }

    // 2. Verify current password
    const isValidPassword = await verifyPassword(userRecord.passwordHash, body.current_password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // 3. Check password history to prevent reuse
    const passwordIsNew = await checkPasswordHistory(userRecord.id, body.new_password);
    if (!passwordIsNew) {
      throw new ValidationError('Password was recently used. Please choose a different password.');
    }

    // 4. Update password
    await updatePassword(userRecord.id, body.new_password);

    // 5. Revoke all refresh tokens (force re-login)
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.userId, userRecord.id));

    // 6. Blacklist current access token
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await blacklistToken(token);
    }

    // 7. Return success
    return successResponse({
      message: 'Password changed successfully',
    });
  },
});
