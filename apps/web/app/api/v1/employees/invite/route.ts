/**
 * POST /api/v1/employees/invite
 * Create a user account for an existing employee so they can log in
 *
 * Requirements (AUTH-04):
 * - Owner selects an existing employee record (by UUID)
 * - Provides email + password for the new login account
 * - The endpoint creates a users row with role=employee and links it to the employee record
 * - Prevents duplicate accounts (employee already linked, or email already in use)
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, dbTx, users, roles, employees, passwordHistory } from '@schedulebox/database';
import { hashPassword } from '@/lib/auth/password';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { createdResponse } from '@/lib/utils/response';
import { ConflictError, NotFoundError } from '@schedulebox/shared';
import { employeeInviteSchema } from '@/validations/employee';

export const POST = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.EMPLOYEES_MANAGE],
  bodySchema: employeeInviteSchema,
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Resolve caller's company scope
    const { companyId } = await findCompanyId(user.sub);

    // Look up the employee by UUID, verify company ownership, and verify no user account yet
    const [employee] = await db
      .select({
        id: employees.id,
        name: employees.name,
        companyId: employees.companyId,
        userId: employees.userId,
      })
      .from(employees)
      .where(and(eq(employees.uuid, body.employee_uuid), isNull(employees.deletedAt)))
      .limit(1);

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.companyId !== companyId) {
      throw new NotFoundError('Employee not found');
    }

    if (employee.userId !== null) {
      throw new ConflictError('Employee already has a user account');
    }

    // Check that email is not already in use
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existingUser) {
      throw new ConflictError('Email is already registered');
    }

    // Run everything in a transaction
    const result = await dbTx.transaction(async (tx) => {
      // Hash the password
      const passwordHash = await hashPassword(body.password);

      // Find the employee role ID
      const [employeeRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, 'employee'))
        .limit(1);

      if (!employeeRole) {
        throw new Error('Employee role not found in database');
      }

      // Determine display name (body.name takes precedence, falls back to employee.name)
      const displayName = body.name ?? employee.name;

      // Insert the new users record
      const [newUser] = await tx
        .insert(users)
        .values({
          companyId,
          roleId: employeeRole.id,
          email: body.email,
          passwordHash,
          name: displayName,
          isActive: true,
        })
        .returning({
          id: users.id,
          uuid: users.uuid,
          email: users.email,
          name: users.name,
        });

      // Record initial password in history
      await tx.insert(passwordHistory).values({
        userId: newUser.id,
        passwordHash,
      });

      // Link the employee record to the new user account
      await tx
        .update(employees)
        .set({
          userId: newUser.id,
          email: body.email,
        })
        .where(eq(employees.id, employee.id));

      return newUser;
    });

    return createdResponse({
      uuid: result.uuid,
      email: result.email,
      name: result.name,
      role: 'employee',
    });
  },
});
