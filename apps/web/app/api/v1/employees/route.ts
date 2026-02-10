/**
 * GET /api/v1/employees
 * List employees with assigned services
 *
 * POST /api/v1/employees
 * Create a new employee with optional service assignments
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, employees, employeeServices, services } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { employeeCreateSchema } from '@/validations/employee';

/**
 * List employees
 * Includes assigned services for each employee
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  handler: async ({ user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Query employees with their assigned services
    const employeeList = await db
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
      .where(and(eq(employees.companyId, companyId), isNull(employees.deletedAt)))
      .orderBy(employees.sortOrder, employees.name);

    // For each employee, fetch their assigned services
    const employeesWithServices = await Promise.all(
      employeeList.map(async (employee) => {
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
          .where(eq(employees.uuid, employee.uuid));

        return {
          ...employee,
          services: assignedServices.map((s) => ({
            id: s.id,
            uuid: s.uuid,
            name: s.name,
            duration_minutes: s.duration_minutes,
            price: s.price,
          })),
        };
      }),
    );

    return successResponse({ data: employeesWithServices });
  },
});

/**
 * Create employee
 * Optionally assigns services via service_ids
 */
export const POST = createRouteHandler({
  bodySchema: employeeCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Extract service_ids before creating employee
    const { service_ids, ...employeeData } = body;

    // Create employee in transaction
    const result = await db.transaction(async (tx) => {
      // Insert employee
      const [employee] = await tx
        .insert(employees)
        .values({
          companyId,
          name: employeeData.name,
          email: employeeData.email,
          phone: employeeData.phone,
          title: employeeData.title,
          bio: employeeData.bio,
          color: employeeData.color ?? '#3B82F6',
        })
        .returning({
          id: employees.id,
          uuid: employees.uuid,
          name: employees.name,
          email: employees.email,
        });

      // Insert service assignments if provided
      if (service_ids && service_ids.length > 0) {
        await tx.insert(employeeServices).values(
          service_ids.map((serviceId) => ({
            employeeId: employee.id,
            serviceId,
          })),
        );
      }

      return employee;
    });

    return createdResponse({
      uuid: result.uuid,
      name: result.name,
      email: result.email,
    });
  },
});
