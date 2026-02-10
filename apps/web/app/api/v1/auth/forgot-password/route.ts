/**
 * POST /api/v1/auth/forgot-password
 * Request password reset link
 *
 * Security:
 * - NEVER reveals whether email exists (prevents email enumeration)
 * - Stores hashed token in Redis with 1-hour TTL
 * - Logs reset link to console in development (email service not yet implemented)
 */

import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { db } from '@/lib/db/client';
import { users } from '@schedulebox/database';
import { redis } from '@/lib/redis/client';
import { forgotPasswordSchema } from '@/validations/auth';
import { handleRouteError } from '@/lib/utils/errors';
import { successResponse } from '@/lib/utils/response';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate request body
    const body = await req.json();
    const input = forgotPasswordSchema.parse(body);

    // 2. Find user by email
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    // 3. If user exists, generate reset token
    if (user) {
      const resetToken = nanoid(64);

      // Hash token with SHA-256 for storage
      const tokenHash = createHash('sha256').update(resetToken).digest('hex');

      // Store in Redis with 1-hour TTL (3600 seconds)
      await redis.setex(`password_reset:${tokenHash}`, 3600, user.id.toString());

      // Log reset link to console in development
      // In production, this would send email via notification service
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Password reset link: /reset-password?token=${resetToken}`);
      }

      // TODO: Send email via notification service when implemented
      // await sendPasswordResetEmail(input.email, resetToken);
    }

    // 4. ALWAYS return success message (don't reveal if email exists)
    return successResponse({
      message: 'If an account with that email exists, a password reset link has been sent',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
