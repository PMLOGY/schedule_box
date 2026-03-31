/**
 * Recurring Series Occurrences
 * GET    /api/v1/bookings/recurring/:id/occurrences - List all bookings in a series
 * PUT    /api/v1/bookings/recurring/:id/occurrences - Edit a single occurrence
 * DELETE /api/v1/bookings/recurring/:id/occurrences - Cancel a single occurrence
 */

import { eq, and, isNull, sql } from 'drizzle-orm';
import {
  db,
  bookings,
  recurringSeries,
  users,
  customers,
  services,
  employees,
} from '@schedulebox/database';
import { AppError, NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, paginatedResponse } from '@/lib/utils/response';
import { validateQuery } from '@/lib/middleware/validate';
import {
  recurringSeriesIdParamSchema,
  occurrenceEditSchema,
  occurrenceCancelSchema,
  type RecurringSeriesIdParam,
  type OccurrenceEdit,
  type OccurrenceCancel,
} from '@/validations/recurring';
import { z } from 'zod';
import { editSingleOccurrence, cancelOccurrence } from '@/lib/booking/recurring-service';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/v1/bookings/recurring/:id/occurrences
 * List all bookings (occurrences) belonging to this recurring series
 */
export const GET = createRouteHandler<undefined, RecurringSeriesIdParam>({
  paramsSchema: recurringSeriesIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Resolve series UUID to internal ID
    const [series] = await db
      .select({ id: recurringSeries.id })
      .from(recurringSeries)
      .where(and(eq(recurringSeries.uuid, params.id), eq(recurringSeries.companyId, companyId)))
      .limit(1);

    if (!series) {
      throw new NotFoundError('Recurring series not found');
    }

    const query = validateQuery(paginationSchema, req);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    // Fetch occurrences (bookings) for this series
    const data = await db
      .select({
        id: bookings.uuid,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
        source: bookings.source,
        notes: bookings.notes,
        price: bookings.price,
        currency: bookings.currency,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        // Customer
        customerUuid: customers.uuid,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        // Service
        serviceUuid: services.uuid,
        serviceName: services.name,
        serviceDurationMinutes: services.durationMinutes,
        servicePrice: services.price,
        // Employee
        employeeUuid: employees.uuid,
        employeeName: employees.name,
      })
      .from(bookings)
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(employees, eq(bookings.employeeId, employees.id))
      .where(
        and(
          eq(bookings.recurringSeriesId, series.id),
          eq(bookings.companyId, companyId),
          isNull(bookings.deletedAt),
        ),
      )
      .orderBy(bookings.startTime)
      .limit(limit)
      .offset(offset);

    // Count total
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.recurringSeriesId, series.id),
          eq(bookings.companyId, companyId),
          isNull(bookings.deletedAt),
        ),
      );

    const totalCount = countResult?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Map to response format
    const responseData = data.map((row) => ({
      id: row.id,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      status: row.status ?? 'pending',
      source: row.source ?? 'admin',
      notes: row.notes,
      price: row.price,
      currency: row.currency ?? 'CZK',
      createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
      customer: {
        id: row.customerUuid,
        name: row.customerName,
        email: row.customerEmail,
        phone: row.customerPhone,
      },
      service: {
        id: row.serviceUuid,
        name: row.serviceName,
        durationMinutes: row.serviceDurationMinutes,
        price: row.servicePrice,
      },
      employee:
        row.employeeUuid && row.employeeName
          ? { id: row.employeeUuid, name: row.employeeName }
          : null,
    }));

    return paginatedResponse(responseData, {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
    });
  },
});

/**
 * PUT /api/v1/bookings/recurring/:id/occurrences
 * Edit a single occurrence within this series
 *
 * Body must include bookingId (UUID) to identify which occurrence.
 * Only that occurrence is modified — other occurrences are unaffected.
 *
 * Returns:
 * - 200: Updated booking
 * - 404: Booking or series not found
 * - 409: New time slot conflict
 */
export const PUT = createRouteHandler<OccurrenceEdit, RecurringSeriesIdParam>({
  bodySchema: occurrenceEditSchema,
  paramsSchema: recurringSeriesIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_UPDATE],
  handler: async ({ body, params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Verify series exists
    const [series] = await db
      .select({ id: recurringSeries.id })
      .from(recurringSeries)
      .where(and(eq(recurringSeries.uuid, params.id), eq(recurringSeries.companyId, companyId)))
      .limit(1);

    if (!series) {
      throw new NotFoundError('Recurring series not found');
    }

    const updated = await editSingleOccurrence(
      body.bookingId,
      {
        startTime: body.startTime,
        employeeId: body.employeeId,
        notes: body.notes,
      },
      companyId,
    );

    return successResponse(updated);
  },
});

/**
 * DELETE /api/v1/bookings/recurring/:id/occurrences
 * Cancel a single occurrence within this series
 *
 * Body must include bookingId (UUID) to identify which occurrence.
 * Uses booking-transitions cancelBooking for state machine + events.
 *
 * Returns:
 * - 200: Cancelled booking
 * - 404: Booking or series not found
 */
export const DELETE = createRouteHandler<OccurrenceCancel, RecurringSeriesIdParam>({
  bodySchema: occurrenceCancelSchema,
  paramsSchema: recurringSeriesIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_DELETE],
  handler: async ({ body, params, user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Verify series exists
    const [series] = await db
      .select({ id: recurringSeries.id })
      .from(recurringSeries)
      .where(and(eq(recurringSeries.uuid, params.id), eq(recurringSeries.companyId, companyId)))
      .limit(1);

    if (!series) {
      throw new NotFoundError('Recurring series not found');
    }

    // Get user internal ID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userSub))
      .limit(1);

    if (!userRecord) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    // Admin endpoint — cancel as admin role
    const cancelled = await cancelOccurrence(body.bookingId, companyId, {
      userId: userRecord.id,
      userRole: 'admin',
      reason: body.reason,
    });

    return successResponse(cancelled);
  },
});
