/**
 * POST /api/v1/auth/verify-email
 * Verify user email address using token
 *
 * Actions:
 * 1. Validate verification token from Redis
 * 2. Mark user as emailVerified=true
 * 3. Delete token (one-time use)
 */

import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db } from '@/lib/db/client';
import { users } from '@schedulebox/database';
import { redis } from '@/lib/redis/client';
import { verifyEmailSchema } from '@/validations/auth';
import { handleRouteError } from '@/lib/utils/errors';
import { successResponse } from '@/lib/utils/response';
import { BadRequestError } from '@schedulebox/shared';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate request body
    const body = await req.json();
    const input = verifyEmailSchema.parse(body);

    // 2. Hash token and look up in Redis
    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const userIdRaw = await redis.get<string>(`email_verify:${tokenHash}`);

    if (!userIdRaw) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    const userId = parseInt(String(userIdRaw), 10);

    // 3. Update user: emailVerified=true
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));

    // 4. Delete Redis key (one-time use)
    await redis.del(`email_verify:${tokenHash}`);

    // 5. Return success
    return successResponse({
      message: 'Email verified successfully',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
