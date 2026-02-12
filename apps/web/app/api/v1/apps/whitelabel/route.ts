/**
 * White-label App Management Endpoints
 * GET  /api/v1/apps/whitelabel - Get company's white-label app config
 * POST /api/v1/apps/whitelabel - Create white-label app config
 * PUT  /api/v1/apps/whitelabel - Update white-label app branding
 */

import { eq } from 'drizzle-orm';
import { db, whitelabelApps } from '@schedulebox/database';
import { ConflictError, NotFoundError } from '@schedulebox/shared';
import { whitelabelAppCreateSchema, whitelabelAppUpdateSchema } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, createdResponse } from '@/lib/utils/response';

/**
 * GET /api/v1/apps/whitelabel
 * Get company's white-label app configuration
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.WHITELABEL_MANAGE],
  handler: async ({ user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Query white-label app for this company
    const [app] = await db
      .select()
      .from(whitelabelApps)
      .where(eq(whitelabelApps.companyId, companyId))
      .limit(1);

    // If no app exists, return null (not an error - company may not have configured one yet)
    if (!app) {
      return successResponse(null);
    }

    // Return app config with UUID (never SERIAL ID)
    return successResponse({
      id: app.uuid,
      app_name: app.appName,
      bundle_id: app.bundleId,
      logo_url: app.logoUrl,
      primary_color: app.primaryColor,
      secondary_color: app.secondaryColor,
      features: app.features,
      ios_status: app.iosStatus,
      android_status: app.androidStatus,
      ios_app_store_url: app.iosAppStoreUrl,
      android_play_store_url: app.androidPlayStoreUrl,
      last_build_at: app.lastBuildAt?.toISOString(),
      created_at: app.createdAt?.toISOString(),
      updated_at: app.updatedAt?.toISOString(),
    });
  },
});

/**
 * POST /api/v1/apps/whitelabel
 * Create white-label app configuration
 */
export const POST = createRouteHandler({
  bodySchema: whitelabelAppCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.WHITELABEL_MANAGE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Check if app already exists for this company (UNIQUE constraint)
    const [existing] = await db
      .select({ id: whitelabelApps.id })
      .from(whitelabelApps)
      .where(eq(whitelabelApps.companyId, companyId))
      .limit(1);

    if (existing) {
      throw new ConflictError('App already exists for this company. Use PUT to update.');
    }

    // Insert white-label app
    const [app] = await db
      .insert(whitelabelApps)
      .values({
        companyId,
        appName: body.appName,
        bundleId: body.bundleId,
        logoUrl: body.logoUrl,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        features: body.features,
        // Default status is 'draft' (set by DB schema)
        iosStatus: 'draft',
        androidStatus: 'draft',
      })
      .returning();

    // Return created app (use UUID, not SERIAL id)
    return createdResponse({
      id: app.uuid,
      app_name: app.appName,
      bundle_id: app.bundleId,
      logo_url: app.logoUrl,
      primary_color: app.primaryColor,
      secondary_color: app.secondaryColor,
      features: app.features,
      ios_status: app.iosStatus,
      android_status: app.androidStatus,
      ios_app_store_url: app.iosAppStoreUrl,
      android_play_store_url: app.androidPlayStoreUrl,
      last_build_at: app.lastBuildAt?.toISOString(),
      created_at: app.createdAt?.toISOString(),
      updated_at: app.updatedAt?.toISOString(),
    });
  },
});

/**
 * PUT /api/v1/apps/whitelabel
 * Update white-label app branding and configuration
 */
export const PUT = createRouteHandler({
  bodySchema: whitelabelAppUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.WHITELABEL_MANAGE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find existing app
    const [existing] = await db
      .select()
      .from(whitelabelApps)
      .where(eq(whitelabelApps.companyId, companyId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('App not found. Create app configuration first.');
    }

    // Update app with validated data
    // Note: Do NOT allow updating iosStatus/androidStatus via PUT (these are system-controlled)
    const [updatedApp] = await db
      .update(whitelabelApps)
      .set({
        appName: body.appName ?? existing.appName,
        bundleId: body.bundleId ?? existing.bundleId,
        logoUrl: body.logoUrl ?? existing.logoUrl,
        primaryColor: body.primaryColor ?? existing.primaryColor,
        secondaryColor: body.secondaryColor ?? existing.secondaryColor,
        features: body.features ?? existing.features,
        updatedAt: new Date(),
      })
      .where(eq(whitelabelApps.companyId, companyId))
      .returning();

    // Return updated app (use UUID)
    return successResponse({
      id: updatedApp.uuid,
      app_name: updatedApp.appName,
      bundle_id: updatedApp.bundleId,
      logo_url: updatedApp.logoUrl,
      primary_color: updatedApp.primaryColor,
      secondary_color: updatedApp.secondaryColor,
      features: updatedApp.features,
      ios_status: updatedApp.iosStatus,
      android_status: updatedApp.androidStatus,
      ios_app_store_url: updatedApp.iosAppStoreUrl,
      android_play_store_url: updatedApp.androidPlayStoreUrl,
      last_build_at: updatedApp.lastBuildAt?.toISOString(),
      created_at: updatedApp.createdAt?.toISOString(),
      updated_at: updatedApp.updatedAt?.toISOString(),
    });
  },
});
