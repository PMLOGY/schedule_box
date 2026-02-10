/**
 * POST /api/v1/auth/refresh
 * Rotate refresh token and generate new access token
 *
 * Accepts refresh_token from:
 * 1. Request body (JSON)
 * 2. httpOnly cookie (set by login)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { rotateRefreshToken } from '@/lib/auth/jwt.js';
import { handleRouteError } from '@/lib/utils/errors.js';
import { successResponse } from '@/lib/utils/response.js';
import { BadRequestError } from '@schedulebox/shared';

export async function POST(req: NextRequest) {
  try {
    // 1. Extract refresh token from body or cookie
    let refreshToken: string | undefined;

    // Try body first
    try {
      const body = await req.json();
      refreshToken = body.refresh_token;
    } catch {
      // Body parsing failed or empty, try cookie
    }

    // Fallback to cookie if not in body
    if (!refreshToken) {
      refreshToken = req.cookies.get('refresh_token')?.value;
    }

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    // 2. Rotate token (revokes old, generates new pair)
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = await rotateRefreshToken(
      refreshToken,
    );

    // 3. Return new tokens and update cookie
    const response = NextResponse.json({
      data: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
      },
    });

    // Update refresh token cookie
    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/api/v1/auth/refresh',
    });

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
