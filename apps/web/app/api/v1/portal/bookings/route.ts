/**
 * GET /api/v1/portal/bookings
 * Customer portal - list authenticated customer's bookings across all companies
 *
 * Resolves user email to customer records across companies,
 * then fetches their bookings with service/employee/company info.
 */

import { eq, and, inArray, desc, isNull, sql } from 'drizzle-orm';
import {
  db,
  users,
  customers,
  bookings,
  services,
  companies,
  employees,
  reviews,
} from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { paginatedResponse } from '@/lib/utils/response';

export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ req, user }) => {
    const userUuid = user!.sub;

    // Get user email
    const [dbUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.uuid, userUuid))
      .limit(1);

    if (!dbUser) {
      return paginatedResponse([], { total: 0, page: 1, limit: 20, total_pages: 0 });
    }

    // Find all customer records matching this email across companies
    const customerRecords = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.email, dbUser.email), isNull(customers.deletedAt)));

    if (customerRecords.length === 0) {
      return paginatedResponse([], { total: 0, page: 1, limit: 20, total_pages: 0 });
    }

    const customerIds = customerRecords.map((c) => c.id);

    // Parse query params
    const url = req.nextUrl;
    const status = url.searchParams.get('status');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [inArray(bookings.customerId, customerIds), isNull(bookings.deletedAt)];

    if (status) {
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as const;
      if (validStatuses.includes(status as (typeof validStatuses)[number])) {
        conditions.push(eq(bookings.status, status as (typeof validStatuses)[number]));
      }
    }

    // Count total
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(and(...conditions));

    // Fetch bookings with joins
    const rows = await db
      .select({
        uuid: bookings.uuid,
        status: bookings.status,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        price: bookings.price,
        currency: bookings.currency,
        createdAt: bookings.createdAt,
        serviceName: services.name,
        employeeName: employees.name,
        companyName: companies.name,
        companySlug: companies.slug,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(companies, eq(bookings.companyId, companies.id))
      .leftJoin(employees, eq(bookings.employeeId, employees.id))
      .where(and(...conditions))
      .orderBy(desc(bookings.startTime))
      .limit(limit)
      .offset(offset);

    // Check which bookings have reviews
    const bookingUuids = rows.map((r) => r.uuid);
    const reviewMap = new Map<string, boolean>();
    if (bookingUuids.length > 0) {
      // Get booking IDs for review check
      const bookingIdRows = await db
        .select({ id: bookings.id, uuid: bookings.uuid })
        .from(bookings)
        .where(inArray(bookings.uuid, bookingUuids));

      const bookingIdMap = new Map(bookingIdRows.map((b) => [b.id, b.uuid]));
      const bookingIds = bookingIdRows.map((b) => b.id);

      if (bookingIds.length > 0) {
        const reviewRows = await db
          .select({ bookingId: reviews.bookingId })
          .from(reviews)
          .where(and(inArray(reviews.bookingId, bookingIds), isNull(reviews.deletedAt)));

        for (const r of reviewRows) {
          if (r.bookingId) {
            const uuid = bookingIdMap.get(r.bookingId);
            if (uuid) reviewMap.set(uuid, true);
          }
        }
      }
    }

    const data = rows.map((row) => ({
      uuid: row.uuid,
      status: row.status,
      start_time: row.startTime.toISOString(),
      end_time: row.endTime.toISOString(),
      service_name: row.serviceName,
      employee_name: row.employeeName || null,
      company_name: row.companyName,
      company_slug: row.companySlug,
      price: row.price,
      currency: row.currency,
      created_at: row.createdAt.toISOString(),
      has_review: reviewMap.get(row.uuid) ?? false,
    }));

    return paginatedResponse(data, {
      total: count,
      page,
      limit,
      total_pages: Math.ceil(count / limit),
    });
  },
});
