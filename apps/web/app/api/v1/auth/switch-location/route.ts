/**
 * POST /api/v1/auth/switch-location
 * Switch active company context for multi-location organizations
 *
 * Flow:
 * 1. Authenticate current JWT
 * 2. Validate target company UUID from body
 * 3. Verify user has org access to target company (via validateLocationAccess)
 * 4. Persist active company in users table (keeps token refresh & findCompanyId in sync)
 * 5. Generate new JWT with target company_id
 * 6. Blacklist old access token
 * 7. Return new token pair + company info
 *
 * Security: Cross-org switch MUST return 403.
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { companies, users } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { generateTokenPair, blacklistToken } from '@/lib/auth/jwt';
import { validateLocationAccess } from '@/lib/db/org-scope';
import { switchLocationSchema } from '@/validations/organization';

export const POST = createRouteHandler({
  bodySchema: switchLocationSchema,
  requiresAuth: true,
  handler: async ({ req, body, user }) => {
    // 1. Validate user can access target location
    // Throws ForbiddenError for cross-org or unauthorized access
    const access = await validateLocationAccess(user!.sub, body.company_uuid);

    // 2. Persist active company in DB so token refresh and findCompanyId stay in sync
    await db
      .update(users)
      .set({ companyId: access.targetCompanyId })
      .where(eq(users.id, access.userInternalId));

    // 3. Generate new token pair with target company_id
    const { accessToken, refreshToken, expiresIn } = await generateTokenPair(
      access.userInternalId,
      user!.sub,
      access.targetCompanyId,
      access.roleId,
      access.roleName,
      access.mfaVerified,
    );

    // 4. Blacklist old access token so it cannot be reused
    const oldToken = req.headers.get('authorization')?.substring(7);
    if (oldToken) {
      await blacklistToken(oldToken);
    }

    // 5. Get target company details for response
    const [targetCompany] = await db
      .select({
        name: companies.name,
        slug: companies.slug,
      })
      .from(companies)
      .where(eq(companies.id, access.targetCompanyId))
      .limit(1);

    // 6. Return new tokens + company info
    const response = NextResponse.json({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        company: {
          uuid: body.company_uuid,
          name: targetCompany?.name ?? '',
          slug: targetCompany?.slug ?? '',
        },
      },
    });

    // Set refresh token as httpOnly cookie (same pattern as login route)
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/api/v1/auth/refresh',
    });

    return response;
  },
});
