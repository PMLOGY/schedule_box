/**
 * Company working hours endpoints
 * GET /api/v1/settings/working-hours - Get company-level default working hours
 * PUT /api/v1/settings/working-hours - Update company-level default working hours
 */

import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { successResponse } from '@/lib/utils/response.js';
import { companyWorkingHoursSchema } from '@/validations/settings.js';
import { db, workingHours } from '@schedulebox/database';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * GET /api/v1/settings/working-hours
 * Get company-level default working hours (employeeId IS NULL)
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Query company-level working hours
    const hours = await db
      .select({
        id: workingHours.id,
        day_of_week: workingHours.dayOfWeek,
        start_time: workingHours.startTime,
        end_time: workingHours.endTime,
        is_active: workingHours.isActive,
        created_at: workingHours.createdAt,
      })
      .from(workingHours)
      .where(and(eq(workingHours.companyId, companyId), isNull(workingHours.employeeId)));

    return successResponse({ data: hours });
  },
});

/**
 * PUT /api/v1/settings/working-hours
 * Bulk replace company-level default working hours
 * Deletes existing company-level hours and inserts new ones
 */
export const PUT = createRouteHandler({
  bodySchema: companyWorkingHoursSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ body, user }) => {
    // Get company ID from authenticated user
    const { companyId } = await findCompanyId(user!.sub);

    // Delete existing company-level working hours
    await db
      .delete(workingHours)
      .where(and(eq(workingHours.companyId, companyId), isNull(workingHours.employeeId)));

    // Insert new working hours
    if (body!.length > 0) {
      await db.insert(workingHours).values(
        body!.map((hour) => ({
          companyId,
          employeeId: null,
          dayOfWeek: hour.day_of_week,
          startTime: hour.start_time,
          endTime: hour.end_time,
          isActive: hour.is_active ?? true,
        })),
      );
    }

    return successResponse({ message: 'Working hours updated' });
  },
});
