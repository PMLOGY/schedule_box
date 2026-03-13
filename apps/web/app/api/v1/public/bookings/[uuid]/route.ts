/**
 * GET /api/v1/public/bookings/[uuid]
 * Public booking status lookup - no authentication required
 *
 * Returns booking status, date, service name, company name.
 * Does not expose sensitive customer data.
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, bookings, services, companies, employees } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { NotFoundError } from '@schedulebox/shared';

const bookingUuidParamSchema = z.object({
  uuid: z.string().uuid(),
});

type BookingUuidParam = z.infer<typeof bookingUuidParamSchema>;

export const GET = createRouteHandler<undefined, BookingUuidParam>({
  requiresAuth: false,
  paramsSchema: bookingUuidParamSchema,
  handler: async ({ params }) => {
    const [row] = await db
      .select({
        uuid: bookings.uuid,
        status: bookings.status,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        price: bookings.price,
        currency: bookings.currency,
        createdAt: bookings.createdAt,
        cancelledAt: bookings.cancelledAt,
        serviceName: services.name,
        serviceDuration: services.durationMinutes,
        companyName: companies.name,
        companySlug: companies.slug,
        employeeName: employees.name,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(companies, eq(bookings.companyId, companies.id))
      .leftJoin(employees, eq(bookings.employeeId, employees.id))
      .where(eq(bookings.uuid, params.uuid))
      .limit(1);

    if (!row) {
      throw new NotFoundError('Booking not found');
    }

    return successResponse({
      uuid: row.uuid,
      status: row.status,
      start_time: row.startTime.toISOString(),
      end_time: row.endTime.toISOString(),
      price: row.price,
      currency: row.currency,
      created_at: row.createdAt.toISOString(),
      cancelled_at: row.cancelledAt?.toISOString() || null,
      service_name: row.serviceName,
      company_name: row.companyName,
      company_slug: row.companySlug,
      employee_name: row.employeeName || null,
    });
  },
});
