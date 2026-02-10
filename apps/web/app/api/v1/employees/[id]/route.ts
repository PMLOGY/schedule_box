/**
 * GET /api/v1/employees/[id]
 * Get employee details by UUID
 *
 * PUT /api/v1/employees/[id]
 * Update employee by UUID
 *
 * DELETE /api/v1/employees/[id]
 * Soft delete employee by UUID
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, employees, employeeServices, services } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { employeeUpdateSchema, employeeIdParamSchema } from '@/validations/employee';
import { NotFoundError } from '@schedulebox/shared';

/**
 * Get employee detail with assigned services
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

    // Query employee by UUID and companyId
    const [employee] = await db
      .select({
        uuid: employees.uuid,
        name: employees.name,
        email: employees.email,
        phone: employees.phone,
        title: employees.title,
        bio: employees.bio,
        avatar_url: employees.avatarUrl,
        color: employees.color,
        sort_order: employees.sortOrder,
        is_active: employees.isActive,
        created_at: employees.createdAt,
        updated_at: employees.updatedAt,
      })
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

    // Fetch assigned services
    const assignedServices = await db
      .select({
        id: services.id,
        uuid: services.uuid,
        name: services.name,
        duration_minutes: services.durationMinutes,
        price: services.price,
      })
      .from(employeeServices)
      .innerJoin(services, eq(employeeServices.serviceId, services.id))
      .innerJoin(employees, eq(employeeServices.employeeId, employees.id))
      .where(eq(employees.uuid, params.id));

    return successResponse({
      ...employee,
      services: assignedServices.map((s) => ({
        id: s.id,
        uuid: s.uuid,
        name: s.name,
        duration_minutes: s.duration_minutes,
        price: s.price,
      })),
    });
  },
});

/**
 * Update employee
 */
export const PUT = createRouteHandler({
  paramsSchema: employeeIdParamSchema,
  bodySchema: employeeUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  handler: async ({ params, body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.is_active !== undefined) updateData.isActive = body.is_active;

    // Update employee
    const [updated] = await db
      .update(employees)
      .set(updateData)
      .where(
        and(
          eq(employees.uuid, params.id),
          eq(employees.companyId, companyId),
          isNull(employees.deletedAt),
        ),
      )
      .returning({
        uuid: employees.uuid,
        name: employees.name,
        email: employees.email,
      });

    if (!updated) {
      throw new NotFoundError('Employee not found');
    }

    return successResponse(updated);
  },
});

/**
 * Soft delete employee
 */
export const DELETE = createRouteHandler({
  paramsSchema: employeeIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  handler: async ({ params, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Soft delete by setting deletedAt
    const [deleted] = await db
      .update(employees)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(employees.uuid, params.id),
          eq(employees.companyId, companyId),
          isNull(employees.deletedAt),
        ),
      )
      .returning({ uuid: employees.uuid });

    if (!deleted) {
      throw new NotFoundError('Employee not found');
    }

    return noContentResponse();
  },
});
