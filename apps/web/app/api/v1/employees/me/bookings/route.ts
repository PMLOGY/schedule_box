/**
 * GET /api/v1/employees/me/bookings
 *
 * Employee self-service endpoint: returns only bookings assigned to the
 * authenticated employee. Resolves the JWT user UUID to the employee's
 * internal ID and forces the employee_id filter so the client cannot
 * request other employees' bookings by manipulating query params.
 */

import { eq, and } from 'drizzle-orm';
import { db, users, employees } from '@schedulebox/database';
import { NotFoundError, ForbiddenError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { paginatedResponse } from '@/lib/utils/response';
import { bookingListQuerySchema, type BookingListQuery } from '@/validations/booking';
import { listBookings } from '@/lib/booking/booking-service';

/**
 * Resolve the current user to their employee record.
 * Throws 404 if the user is not linked to an employee.
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
 * GET /api/v1/employees/me/bookings
 * Returns paginated bookings assigned to the authenticated employee only.
 * The employee_id filter is forced server-side — clients cannot override it.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ req, user }) => {
    if (!user) throw new ForbiddenError('Not authenticated');

    const employee = await resolveEmployee(user.sub, user.company_id);

    // Parse client-supplied query params (page, limit, status, date filters, etc.)
    const query = validateQuery(bookingListQuerySchema, req) as BookingListQuery;

    // Force employee_id so the employee only ever sees their own bookings
    const filteredQuery: BookingListQuery = {
      ...query,
      employee_id: employee.id,
    };

    const { data, meta } = await listBookings(filteredQuery, user.company_id);

    return paginatedResponse(data, meta);
  },
});
