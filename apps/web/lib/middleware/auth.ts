/**
 * JWT authentication middleware
 * Extracts and verifies JWT from Authorization Bearer header
 */

import { type NextRequest } from 'next/server';
import { verifyJWT, type JWTPayload } from '@/lib/auth/jwt.js';
import { UnauthorizedError } from '@schedulebox/shared';

/**
 * Authenticate incoming request using JWT Bearer token
 *
 * @param req - Next.js request object
 * @returns Decoded JWT payload with user claims
 * @throws UnauthorizedError if token is missing, malformed, or invalid
 */
export async function authenticateRequest(req: NextRequest): Promise<JWTPayload> {
  const authorization = req.headers.get('authorization');

  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  // Extract token (everything after 'Bearer ')
  const token = authorization.substring(7);

  try {
    const payload = await verifyJWT(token);
    return payload;
  } catch (error) {
    // Re-throw UnauthorizedError as-is
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    // Wrap other errors in UnauthorizedError
    throw new UnauthorizedError('Authentication failed');
  }
}
