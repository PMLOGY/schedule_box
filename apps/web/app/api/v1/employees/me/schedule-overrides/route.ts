/**
 * GET  /api/v1/employees/me/schedule-overrides - List current employee's overrides
 * POST /api/v1/employees/me/schedule-overrides - Create a new schedule override (day off)
 *
 * Employee self-service endpoint for day-off requests and schedule overrides.
 */

import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db, users, employees, workingHoursOverrides } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse, createdResponse } from '@/lib/utils/response';
import { NotFoundError, ForbiddenError } from '@schedulebox/shared';

/**
 * Resolve the current user to their employee record.
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
 * GET /api/v1/employees/me/schedule-overrides
 * Lists schedule overrides for the authenticated employee (future only)
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user) throw new ForbiddenError('Not authenticated');

    const employee = await resolveEmployee(user.sub, user.company_id);

    // Only return overrides from today onwards
    const today = new Date().toISOString().split('T')[0];

    const overrides = await db
      .select({
        id: workingHoursOverrides.id,
        date: workingHoursOverrides.date,
        start_time: workingHoursOverrides.startTime,
        end_time: workingHoursOverrides.endTime,
        is_day_off: workingHoursOverrides.isDayOff,
        reason: workingHoursOverrides.reason,
        created_at: workingHoursOverrides.createdAt,
      })
      .from(workingHoursOverrides)
      .where(
        and(
          eq(workingHoursOverrides.employeeId, employee.id),
          eq(workingHoursOverrides.companyId, user.company_id),
          gte(workingHoursOverrides.date, today),
        ),
      )
      .orderBy(workingHoursOverrides.date);

    return successResponse(overrides);
  },
});

/**
 * POST /api/v1/employees/me/schedule-overrides
 * Create a new schedule override (day off request, or modified hours)
 */
const createOverrideSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    is_day_off: z.boolean(),
    reason: z.string().max(255).optional(),
    start_time: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM')
      .optional(),
    end_time: z
      .string()
      .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM')
      .optional(),
  })
  .refine(
    (data) => {
      // If not a day off, start_time and end_time are required
      if (!data.is_day_off) {
        return !!data.start_time && !!data.end_time;
      }
      return true;
    },
    { message: 'start_time and end_time are required when is_day_off is false' },
  );

export const POST = createRouteHandler({
  requiresAuth: true,
  bodySchema: createOverrideSchema,
  handler: async ({ body, user }) => {
    if (!user) throw new ForbiddenError('Not authenticated');

    const employee = await resolveEmployee(user.sub, user.company_id);

    const [override] = await db
      .insert(workingHoursOverrides)
      .values({
        companyId: user.company_id,
        employeeId: employee.id,
        date: body.date,
        startTime: body.start_time ?? null,
        endTime: body.end_time ?? null,
        isDayOff: body.is_day_off,
        reason: body.reason ?? null,
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
