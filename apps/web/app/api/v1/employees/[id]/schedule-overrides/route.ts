/**
 * POST /api/v1/employees/[id]/schedule-overrides
 * Create a schedule override (exception) for a specific date
 * Used for day-off entries or modified working hours on specific dates
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, employees, workingHoursOverrides } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { createdResponse } from '@/lib/utils/response.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { scheduleOverrideSchema, employeeIdParamSchema } from '@/validations/employee.js';
import { NotFoundError } from '@schedulebox/shared';

/**
 * Create schedule override for employee
 * Creates a date-specific exception (e.g., day off, modified hours)
 */
export const POST = createRouteHandler({
  paramsSchema: employeeIdParamSchema,
  bodySchema: scheduleOverrideSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  handler: async ({ params, body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Verify employee exists and belongs to company
    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(eq(employees.uuid, params.id), eq(employees.companyId, companyId), isNull(employees.deletedAt)),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Insert schedule override
    const [override] = await db
      .insert(workingHoursOverrides)
      .values({
        companyId,
        employeeId: employee.id,
        date: body.date,
        startTime: body.start_time,
        endTime: body.end_time,
        isDayOff: body.is_day_off ?? false,
        reason: body.reason,
      })
      .returning({
        id: workingHoursOverrides.id,
        date: workingHoursOverrides.date,
        start_time: workingHoursOverrides.startTime,
        end_time: workingHoursOverrides.endTime,
        is_day_off: workingHoursOverrides.isDayOff,
        reason: workingHoursOverrides.reason,
        created_at: workingHoursOverrides.createdAt,
      });

    return createdResponse(override);
  },
});
