/**
 * GET /api/v1/auth/me/employee - Get current user's employee record
 *
 * Resolves the authenticated user to their employee record.
 * Used by employee-role users to get their employee UUID, name, etc.
 */

import { eq, and } from 'drizzle-orm';
import { db, users, employees } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError } from '@schedulebox/shared';

export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user) throw new NotFoundError('Not authenticated');

    // Look up user's internal ID from UUID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, user.sub))
      .limit(1);

    if (!userRecord) throw new NotFoundError('User not found');

    // Find employee record linked to this user in their company
    const [employee] = await db
      .select({
        uuid: employees.uuid,
        name: employees.name,
        email: employees.email,
        phone: employees.phone,
        title: employees.title,
        avatarUrl: employees.avatarUrl,
      })
      .from(employees)
      .where(and(eq(employees.userId, userRecord.id), eq(employees.companyId, user.company_id)))
      .limit(1);

    if (!employee) throw new NotFoundError('Employee record not found');

    return successResponse({
      uuid: employee.uuid,
      name: employee.name,
      email: employee.email,
      phone: employee.phone ?? null,
      title: employee.title ?? null,
      avatar_url: employee.avatarUrl ?? null,
    });
  },
});
