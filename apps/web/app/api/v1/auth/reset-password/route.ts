/**
 * POST /api/v1/auth/reset-password
 * Reset password using token from forgot-password flow
 *
 * Actions:
 * 1. Validate reset token from Redis
 * 2. Check password history to prevent reuse
 * 3. Update password
 * 4. Disable MFA (security measure per research pitfall #3)
 * 5. Revoke all refresh tokens (force re-login)
 */

import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db } from '@/lib/db/client';
import { users, refreshTokens } from '@schedulebox/database';
import { checkPasswordHistory, updatePassword } from '@/lib/auth/password';
import { redis } from '@/lib/redis/client';
import { resetPasswordSchema } from '@/validations/auth';
import { handleRouteError } from '@/lib/utils/errors';
import { successResponse } from '@/lib/utils/response';
import { BadRequestError, ValidationError } from '@schedulebox/shared';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate request body
    const body = await req.json();
    const input = resetPasswordSchema.parse(body);

    // 2. Hash provided token and look up in Redis
    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const userIdRaw = await redis.get<string>(`password_reset:${tokenHash}`);

    if (!userIdRaw) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    const userId = parseInt(String(userIdRaw), 10);

    // 3. Check password history
    const passwordIsNew = await checkPasswordHistory(userId, input.new_password);
    if (!passwordIsNew) {
      throw new ValidationError('Password was recently used. Please choose a different password.');
    }

    // 4. Update password (also updates password_history)
    await updatePassword(userId, input.new_password);

    // 5. Delete Redis token (one-time use)
    await redis.del(`password_reset:${tokenHash}`);

    // 6. Disable MFA (security measure per research pitfall #3)
    await db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
      })
      .where(eq(users.id, userId));

    // 7. Revoke all refresh tokens (force re-login)
    await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, userId));

    // 8. Return success
    return successResponse({
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
