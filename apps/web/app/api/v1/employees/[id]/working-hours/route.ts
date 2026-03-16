/**
 * GET /api/v1/employees/[id]/working-hours
 * Get working hours for an employee
 *
 * PUT /api/v1/employees/[id]/working-hours
 * Bulk replace all working hours for an employee
 * Uses delete + insert pattern for atomic replacement
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, dbTx, employees, workingHours } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { workingHoursCreateSchema, employeeIdParamSchema } from '@/validations/employee';
import { NotFoundError } from '@schedulebox/shared';

/**
 * Get working hours for employee
 */
export const GET = createRouteHandler({
  paramsSchema: employeeIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  handler: async ({ params, user }) => {
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
        and(
          eq(employees.uuid, params.id),
          eq(employees.companyId, companyId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Query working hours for this employee
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
      .where(eq(workingHours.employeeId, employee.id))
      .orderBy(workingHours.dayOfWeek);

    return successResponse({ data: hours });
  },
});

/**
 * Bulk replace working hours for employee
 * Atomically deletes all existing hours and inserts new ones
 */
export const PUT = createRouteHandler({
  paramsSchema: employeeIdParamSchema,
  bodySchema: workingHoursCreateSchema,
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
        and(
          eq(employees.uuid, params.id),
          eq(employees.companyId, companyId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Replace working hours in transaction
    await dbTx.transaction(async (tx) => {
      // 1. Delete existing working hours
      await tx.delete(workingHours).where(eq(workingHours.employeeId, employee.id));

      // 2. Insert new working hours
      if (body.length > 0) {
        await tx.insert(workingHours).values(
          body.map((hours) => ({
            companyId,
            employeeId: employee.id,
            dayOfWeek: hours.day_of_week,
            startTime: hours.start_time,
            endTime: hours.end_time,
            isActive: hours.is_active ?? true,
          })),
        );
      }
    });

    return successResponse({ message: 'Working hours updated successfully' });
  },
});
