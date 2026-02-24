/**
 * GET  /api/v1/onboarding/demo-data — Check if demo data is active
 * POST /api/v1/onboarding/demo-data — Seed Beauty Studio Praha demo data
 * DELETE /api/v1/onboarding/demo-data — Remove all demo data
 */

import { findCompanyId } from '@/lib/db/tenant-scope';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { seedDemoData, removeDemoData, hasDemoData } from '@/lib/onboarding/demo-data-seeder';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/onboarding/demo-data
 * Returns whether demo data is currently loaded for the authenticated company
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);
    const hasDemoDataLoaded = await hasDemoData(companyId);

    return successResponse({ has_demo_data: hasDemoDataLoaded });
  },
});

/**
 * POST /api/v1/onboarding/demo-data
 * Seeds Beauty Studio Praha demo data for the authenticated company.
 * Returns 409 if demo data already exists.
 */
export const POST = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);

    // Prevent double-seeding
    const alreadyExists = await hasDemoData(companyId);
    if (alreadyExists) {
      return NextResponse.json(
        {
          error: {
            code: 'DEMO_DATA_EXISTS',
            message: 'Demo data already exists for this company',
          },
        },
        { status: 409 },
      );
    }

    const result = await seedDemoData(companyId);

    return createdResponse({
      services_created: result.servicesCreated,
      customers_created: result.customersCreated,
      bookings_created: result.bookingsCreated,
      message: 'Demo data seeded successfully',
    });
  },
});

/**
 * DELETE /api/v1/onboarding/demo-data
 * Removes all demo data for the authenticated company
 */
export const DELETE = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { companyId } = await findCompanyId(user.sub);
    await removeDemoData(companyId);

    return successResponse({ message: 'Demo data removed successfully' });
  },
});
