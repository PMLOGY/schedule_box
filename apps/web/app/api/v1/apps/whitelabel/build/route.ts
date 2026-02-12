/**
 * White-label App Build Trigger Endpoint
 * POST /api/v1/apps/whitelabel/build - Trigger white-label app build
 */

import { eq } from 'drizzle-orm';
import { db, whitelabelApps } from '@schedulebox/database';
import { BadRequestError, NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { NextResponse } from 'next/server';

/**
 * POST /api/v1/apps/whitelabel/build
 * Trigger white-label app build
 *
 * Note: This is a placeholder endpoint for Phase 12.
 * Actual build infrastructure (RabbitMQ consumer, Expo CNG, Fastlane)
 * will be implemented in Phase 15 DevOps.
 *
 * For now, this endpoint:
 * 1. Validates app configuration exists
 * 2. Validates required fields are set
 * 3. Updates status to 'building'
 * 4. Returns 202 Accepted
 */
export const POST = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.WHITELABEL_MANAGE],
  handler: async ({ user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find existing app
    const [app] = await db
      .select()
      .from(whitelabelApps)
      .where(eq(whitelabelApps.companyId, companyId))
      .limit(1);

    if (!app) {
      throw new NotFoundError('Create app configuration first');
    }

    // Validate app has required fields
    if (!app.appName || app.appName.trim().length === 0) {
      throw new BadRequestError('App name is required before building');
    }

    // Update app status to 'building'
    // Note: Actual build execution is deferred to Phase 15 DevOps
    // (RabbitMQ consumer, Expo CNG, Fastlane)
    const [updatedApp] = await db
      .update(whitelabelApps)
      .set({
        iosStatus: 'building',
        androidStatus: 'building',
        lastBuildAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(whitelabelApps.companyId, companyId))
      .returning();

    // Return 202 Accepted (async processing)
    return NextResponse.json(
      {
        data: {
          build_id: updatedApp.uuid,
          status: 'building',
          message: 'Build queued. Actual build infrastructure coming in Phase 15.',
          ios_status: updatedApp.iosStatus,
          android_status: updatedApp.androidStatus,
          last_build_at: updatedApp.lastBuildAt?.toISOString(),
        },
      },
      { status: 202 },
    );
  },
});
