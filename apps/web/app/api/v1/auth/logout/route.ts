/**
 * POST /api/v1/auth/logout
 * Logout user and revoke all tokens
 *
 * Actions:
 * 1. Blacklist current access token in Redis
 * 2. Revoke all refresh tokens for user
 * 3. Clear refresh token cookie
 */

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users, refreshTokens } from '@schedulebox/database';
import { blacklistToken } from '@/lib/auth/jwt';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { noContentResponse } from '@/lib/utils/response';

export const POST = createRouteHandler({
  requiresAuth: true,
  handler: async ({ req, user }) => {
    // 1. Extract access token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await blacklistToken(token);
    }

    // 2. Find user by UUID to get internal userId
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, user!.sub))
      .limit(1);

    if (userRecord) {
      // 3. Revoke all refresh tokens for user
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.userId, userRecord.id));
    }

    // 4. Return 204 No Content with cleared cookie
    const response = noContentResponse();

    // Clear refresh token cookie
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https') ?? false,
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/api/v1/auth/refresh',
    });

    return response;
  },
});
