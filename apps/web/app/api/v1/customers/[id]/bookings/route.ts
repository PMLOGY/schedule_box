/**
 * Customer Bookings Endpoint
 * GET /api/v1/customers/[id]/bookings - List customer's bookings with pagination
 */

import { eq, and, isNull, sql } from 'drizzle-orm';
import { db, customers, bookings } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { paginatedResponse } from '@/lib/utils/response';
import { customerIdParamSchema, type CustomerIdParam } from '@/validations/customer';
import { z } from 'zod';

/**
 * Query schema for pagination
 */
const bookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/v1/customers/[id]/bookings
 * List all bookings for a specific customer with pagination
 */
export const GET = createRouteHandler<undefined, CustomerIdParam>({
  paramsSchema: customerIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, params, user }) => {
    // Find user's company ID for tenant isolation
    const { companyId } = await findCompanyId(user!.sub);

    // Find customer by UUID with tenant isolation
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.uuid, params!.id),
          eq(customers.companyId, companyId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Parse pagination query parameters
    const query = validateQuery(bookingsQuerySchema, req);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    // Query bookings for this customer (scoped to company and not deleted)
    const data = await db
      .select({
        id: bookings.uuid,
        service_id: bookings.serviceId,
        employee_id: bookings.employeeId,
        start_time: bookings.startTime,
        end_time: bookings.endTime,
        status: bookings.status,
        source: bookings.source,
        notes: bookings.notes,
        price: bookings.price,
        currency: bookings.currency,
        discount_amount: bookings.discountAmount,
        no_show_probability: bookings.noShowProbability,
        created_at: bookings.createdAt,
        updated_at: bookings.updatedAt,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.customerId, customer.id),
          eq(bookings.companyId, companyId),
          isNull(bookings.deletedAt),
        ),
      )
      .orderBy(bookings.startTime)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.customerId, customer.id),
          eq(bookings.companyId, companyId),
          isNull(bookings.deletedAt),
        ),
      );

    const totalCount = countResult.count;
    const totalPages = Math.ceil(totalCount / limit);

    return paginatedResponse(data, {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
    });
  },
});
