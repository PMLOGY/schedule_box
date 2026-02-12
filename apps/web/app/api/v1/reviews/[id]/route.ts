/**
 * Review Detail and Delete Endpoints
 * GET    /api/v1/reviews/[id] - Get review detail
 * DELETE /api/v1/reviews/[id] - Soft delete review
 */

import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db, reviews, customers, services, employees } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, noContentResponse } from '@/lib/utils/response';

// Param schema for review UUID
const reviewIdParamSchema = z.object({
  id: z.string().uuid('Invalid review ID format'),
});

/**
 * GET /api/v1/reviews/[id]
 * Get review detail by UUID
 */
export const GET = createRouteHandler({
  paramsSchema: reviewIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ params, user }) => {
    const reviewUuid = params.id;
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Query review by UUID with JOINs for related data
    const [review] = await db
      .select({
        uuid: reviews.uuid,
        customerId: reviews.customerId,
        customerName: customers.name,
        bookingId: reviews.bookingId,
        serviceId: reviews.serviceId,
        serviceName: services.name,
        employeeId: reviews.employeeId,
        employeeName: employees.name,
        rating: reviews.rating,
        comment: reviews.comment,
        redirectedTo: reviews.redirectedTo,
        isPublished: reviews.isPublished,
        reply: reviews.reply,
        repliedAt: reviews.repliedAt,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .leftJoin(customers, eq(reviews.customerId, customers.id))
      .leftJoin(services, eq(reviews.serviceId, services.id))
      .leftJoin(employees, eq(reviews.employeeId, employees.id))
      .where(
        and(eq(reviews.uuid, reviewUuid), eq(reviews.companyId, companyId), isNull(reviews.deletedAt)),
      )
      .limit(1);

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    return successResponse({
      id: review.uuid,
      customer_id: review.customerId,
      customer_name: review.customerName,
      booking_id: review.bookingId,
      service_id: review.serviceId,
      service_name: review.serviceName,
      employee_id: review.employeeId,
      employee_name: review.employeeName,
      rating: review.rating,
      comment: review.comment,
      redirected_to: review.redirectedTo,
      is_published: review.isPublished,
      reply: review.reply,
      replied_at: review.repliedAt?.toISOString(),
      created_at: review.createdAt?.toISOString(),
      updated_at: review.updatedAt?.toISOString(),
    });
  },
});

/**
 * DELETE /api/v1/reviews/[id]
 * Soft delete review (owner/admin only)
 */
export const DELETE = createRouteHandler({
  paramsSchema: reviewIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SETTINGS_MANAGE],
  handler: async ({ params, user }) => {
    const reviewUuid = params.id;
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Soft delete: set deletedAt and isPublished=false
    const [updated] = await db
      .update(reviews)
      .set({
        deletedAt: new Date(),
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(
        and(eq(reviews.uuid, reviewUuid), eq(reviews.companyId, companyId), isNull(reviews.deletedAt)),
      )
      .returning({ id: reviews.id });

    if (!updated) {
      throw new NotFoundError('Review not found');
    }

    // Return 204 No Content
    return noContentResponse();
  },
});
