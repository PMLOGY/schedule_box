/**
 * POST /api/v1/auth/forgot-password
 * Request password reset link
 *
 * Security:
 * - NEVER reveals whether email exists (prevents email enumeration)
 * - Stores hashed token in Redis with 1-hour TTL
 * - Email send errors are logged but not exposed to caller
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
import { sendPasswordResetEmail } from '@/lib/email/auth-emails';

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

      try {
        await sendPasswordResetEmail(input.email, resetToken);
      } catch (err) {
        // Log but do not expose email failure to caller (security: don't reveal if email exists)
        console.error('[Forgot Password] Email send failed:', err);
      }
    }

    // 4. ALWAYS return success message (don't reveal if email exists)
    return successResponse({
      message: 'If an account with that email exists, a password reset link has been sent',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
