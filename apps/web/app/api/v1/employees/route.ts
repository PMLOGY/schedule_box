/**
 * GET /api/v1/employees
 * List employees with assigned services
 *
 * POST /api/v1/employees
 * Create a new employee with optional service assignments
 */

import { eq, and, isNull, inArray } from 'drizzle-orm';
import { db, employees, employeeServices, services } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { employeeCreateSchema } from '@/validations/employee';
import { checkEmployeeLimit } from '@/lib/usage/usage-service';

/**
 * List employees
 * Includes assigned services for each employee (single query with LEFT JOIN)
 *
 * Optional query params:
 * - service_id: Filter to only employees who can provide this service
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  handler: async ({ user, req }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Parse optional service_id filter
    const serviceIdParam = req.nextUrl.searchParams.get('service_id');
    const filterServiceId = serviceIdParam ? parseInt(serviceIdParam, 10) : null;

    // Build where conditions
    const conditions = [eq(employees.companyId, companyId), isNull(employees.deletedAt)];

    // If filtering by service, only include employees assigned to that service
    let employeeIdFilter: number[] | null = null;
    if (filterServiceId && !isNaN(filterServiceId)) {
      const assignedEmployees = await db
        .select({ employeeId: employeeServices.employeeId })
        .from(employeeServices)
        .where(eq(employeeServices.serviceId, filterServiceId));

      employeeIdFilter = assignedEmployees.map((e) => e.employeeId);

      if (employeeIdFilter.length === 0) {
        return successResponse([]);
      }

      conditions.push(inArray(employees.id, employeeIdFilter));
    }

    // Single query: employees LEFT JOIN their assigned services
    const rows = await db
      .select({
        id: employees.id,
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
        service_id: services.id,
        service_uuid: services.uuid,
        service_name: services.name,
        service_duration: services.durationMinutes,
        service_price: services.price,
      })
      .from(employees)
      .leftJoin(employeeServices, eq(employeeServices.employeeId, employees.id))
      .leftJoin(services, eq(employeeServices.serviceId, services.id))
      .where(and(...conditions))
      .orderBy(employees.sortOrder, employees.name);

    // Group rows by employee (LEFT JOIN produces one row per employee-service pair)
    const employeeMap = new Map<
      number,
      {
        id: number;
        uuid: string;
        name: string;
        email: string | null;
        phone: string | null;
        title: string | null;
        bio: string | null;
        avatar_url: string | null;
        color: string | null;
        sort_order: number | null;
        is_active: boolean | null;
        created_at: Date;
        updated_at: Date;
        services: Array<{
          id: number;
          uuid: string;
          name: string;
          duration_minutes: number;
          price: string | null;
        }>;
      }
    >();

    for (const row of rows) {
      if (!employeeMap.has(row.id)) {
        employeeMap.set(row.id, {
          id: row.id,
          uuid: row.uuid,
          name: row.name,
          email: row.email,
          phone: row.phone,
          title: row.title,
          bio: row.bio,
          avatar_url: row.avatar_url,
          color: row.color,
          sort_order: row.sort_order,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
          services: [],
        });
      }

      // Add service if the LEFT JOIN matched (not null)
      if (row.service_id !== null) {
        employeeMap.get(row.id)!.services.push({
          id: row.service_id,
          uuid: row.service_uuid!,
          name: row.service_name!,
          duration_minutes: row.service_duration!,
          price: row.service_price,
        });
      }
    }

    return successResponse(Array.from(employeeMap.values()));
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

    // Check employee limit for company's plan tier
    await checkEmployeeLimit(companyId);

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
