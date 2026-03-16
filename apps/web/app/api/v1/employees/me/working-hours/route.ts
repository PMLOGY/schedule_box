/**
 * GET  /api/v1/employees/me/working-hours - Get current employee's working hours
 * PUT  /api/v1/employees/me/working-hours - Update current employee's working hours
 *
 * Employee self-service endpoint for managing their own working hours.
 * Resolves the authenticated user to their employee record, then
 * reads/writes only their working hours.
 */

import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, users, employees, workingHours } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError, ForbiddenError } from '@schedulebox/shared';

/**
 * Resolve the current user to their employee record.
 * Throws 404 if not linked to an employee.
 */
async function resolveEmployee(userUuid: string, companyId: number) {
  const [userRecord] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.uuid, userUuid))
    .limit(1);

  if (!userRecord) throw new NotFoundError('User not found');

  const [employee] = await db
    .select({ id: employees.id, uuid: employees.uuid })
    .from(employees)
    .where(and(eq(employees.userId, userRecord.id), eq(employees.companyId, companyId)))
    .limit(1);

  if (!employee) throw new NotFoundError('Employee record not found');

  return employee;
}

/**
 * GET /api/v1/employees/me/working-hours
 * Returns working hours for the authenticated employee
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user) throw new ForbiddenError('Not authenticated');

    const employee = await resolveEmployee(user.sub, user.company_id);

    const hours = await db
      .select({
        day_of_week: workingHours.dayOfWeek,
        start_time: workingHours.startTime,
        end_time: workingHours.endTime,
        is_active: workingHours.isActive,
      })
      .from(workingHours)
      .where(
        and(eq(workingHours.employeeId, employee.id), eq(workingHours.companyId, user.company_id)),
      )
      .orderBy(workingHours.dayOfWeek);

    return successResponse(hours);
  },
});

/**
 * PUT /api/v1/employees/me/working-hours
 * Update working hours for the authenticated employee
 */
const workingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Time must be HH:MM or HH:MM:SS'),
  end_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Time must be HH:MM or HH:MM:SS'),
  is_active: z.boolean(),
});

const updateWorkingHoursSchema = z.object({
  hours: z.array(workingHourSchema).min(1).max(7),
});

export const PUT = createRouteHandler({
  requiresAuth: true,
  bodySchema: updateWorkingHoursSchema,
  handler: async ({ body, user }) => {
    if (!user) throw new ForbiddenError('Not authenticated');

    const employee = await resolveEmployee(user.sub, user.company_id);

    // Replace all working hours for this employee in a transaction
    await db.transaction(async (tx) => {
      // Delete existing working hours for this employee
      await tx
        .delete(workingHours)
        .where(
          and(
            eq(workingHours.employeeId, employee.id),
            eq(workingHours.companyId, user.company_id),
          ),
        );

      // Insert new working hours
      if (body.hours.length > 0) {
        await tx.insert(workingHours).values(
          body.hours.map((h) => ({
            companyId: user.company_id,
            employeeId: employee.id,
            dayOfWeek: h.day_of_week,
            startTime: h.start_time,
            endTime: h.end_time,
            isActive: h.is_active,
          })),
        );
      }
    });

    // Return the updated hours
    const updatedHours = await db
      .select({
        day_of_week: workingHours.dayOfWeek,
        start_time: workingHours.startTime,
        end_time: workingHours.endTime,
        is_active: workingHours.isActive,
      })
      .from(workingHours)
      .where(
        and(eq(workingHours.employeeId, employee.id), eq(workingHours.companyId, user.company_id)),
      )
      .orderBy(workingHours.dayOfWeek);

    return successResponse(updatedHours);
  },
});
