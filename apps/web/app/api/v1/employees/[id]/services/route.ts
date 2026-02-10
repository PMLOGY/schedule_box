/**
 * PUT /api/v1/employees/[id]/services
 * Replace all service assignments for an employee
 * Uses delete + insert pattern for atomic replacement
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, employees, employeeServices } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { successResponse } from '@/lib/utils/response.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { employeeServicesSchema, employeeIdParamSchema } from '@/validations/employee.js';
import { NotFoundError } from '@schedulebox/shared';

/**
 * Replace employee service assignments
 * Atomically deletes all existing assignments and inserts new ones
 */
export const PUT = createRouteHandler({
  paramsSchema: employeeIdParamSchema,
  bodySchema: employeeServicesSchema,
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

    // Replace service assignments in transaction
    await db.transaction(async (tx) => {
      // 1. Delete existing assignments
      await tx.delete(employeeServices).where(eq(employeeServices.employeeId, employee.id));

      // 2. Insert new assignments
      if (body.service_ids.length > 0) {
        await tx.insert(employeeServices).values(
          body.service_ids.map((serviceId) => ({
            employeeId: employee.id,
            serviceId,
          })),
        );
      }
    });

    return successResponse({ message: 'Services assigned successfully' });
  },
});
