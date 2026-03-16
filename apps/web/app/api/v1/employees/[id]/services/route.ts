/**
 * GET /api/v1/employees/[id]/services - List employee's assigned services
 * PUT /api/v1/employees/[id]/services - Replace all service assignments
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, employees, employeeServices, services } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { employeeServicesSchema, employeeIdParamSchema } from '@/validations/employee';
import { NotFoundError } from '@schedulebox/shared';

/**
 * GET /api/v1/employees/[id]/services
 * List services assigned to an employee
 */
export const GET = createRouteHandler({
  paramsSchema: employeeIdParamSchema,
  requiresAuth: true,
  handler: async ({ params, user }) => {
    if (!user) throw new Error('User not authenticated');
    const { companyId } = await findCompanyId(user.sub);

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

    if (!employee) throw new NotFoundError('Employee not found');

    const assignedServices = await db
      .select({
        id: services.id,
        uuid: services.uuid,
        name: services.name,
        duration_minutes: services.durationMinutes,
        price: services.price,
        currency: services.currency,
        category_id: services.categoryId,
        is_active: services.isActive,
      })
      .from(employeeServices)
      .innerJoin(services, eq(employeeServices.serviceId, services.id))
      .where(eq(employeeServices.employeeId, employee.id));

    return successResponse(assignedServices);
  },
});

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
