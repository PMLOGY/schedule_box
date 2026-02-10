/**
 * GET /api/v1/services/[id]
 * Get service details by UUID
 *
 * PUT /api/v1/services/[id]
 * Update service by UUID
 *
 * DELETE /api/v1/services/[id]
 * Soft delete service by UUID
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, services, serviceCategories } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { successResponse, noContentResponse } from '@/lib/utils/response.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { serviceUpdateSchema, serviceIdParamSchema } from '@/validations/service.js';
import { NotFoundError } from '@schedulebox/shared';

/**
 * Get service detail
 */
export const GET = createRouteHandler({
  paramsSchema: serviceIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_READ],
  handler: async ({ params, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Query service by UUID and companyId
    const [service] = await db
      .select({
        uuid: services.uuid,
        name: services.name,
        description: services.description,
        category_id: services.categoryId,
        category_name: serviceCategories.name,
        duration_minutes: services.durationMinutes,
        buffer_before_minutes: services.bufferBeforeMinutes,
        buffer_after_minutes: services.bufferAfterMinutes,
        price: services.price,
        currency: services.currency,
        dynamic_pricing_enabled: services.dynamicPricingEnabled,
        price_min: services.priceMin,
        price_max: services.priceMax,
        max_capacity: services.maxCapacity,
        online_booking_enabled: services.onlineBookingEnabled,
        requires_payment: services.requiresPayment,
        cancellation_policy_hours: services.cancellationPolicyHours,
        is_online: services.isOnline,
        video_provider: services.videoProvider,
        color: services.color,
        image_url: services.imageUrl,
        sort_order: services.sortOrder,
        is_active: services.isActive,
        created_at: services.createdAt,
        updated_at: services.updatedAt,
      })
      .from(services)
      .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
      .where(
        and(
          eq(services.uuid, params.id),
          eq(services.companyId, companyId),
          isNull(services.deletedAt),
        ),
      )
      .limit(1);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    return successResponse(service);
  },
});

/**
 * Update service
 */
export const PUT = createRouteHandler({
  paramsSchema: serviceIdParamSchema,
  bodySchema: serviceUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_UPDATE],
  handler: async ({ params, body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category_id !== undefined) updateData.categoryId = body.category_id;
    if (body.duration_minutes !== undefined) updateData.durationMinutes = body.duration_minutes;
    if (body.buffer_before_minutes !== undefined)
      updateData.bufferBeforeMinutes = body.buffer_before_minutes;
    if (body.buffer_after_minutes !== undefined)
      updateData.bufferAfterMinutes = body.buffer_after_minutes;
    if (body.price !== undefined) updateData.price = body.price.toString();
    if (body.dynamic_pricing_enabled !== undefined)
      updateData.dynamicPricingEnabled = body.dynamic_pricing_enabled;
    if (body.price_min !== undefined) updateData.priceMin = body.price_min.toString();
    if (body.price_max !== undefined) updateData.priceMax = body.price_max.toString();
    if (body.max_capacity !== undefined) updateData.maxCapacity = body.max_capacity;
    if (body.online_booking_enabled !== undefined)
      updateData.onlineBookingEnabled = body.online_booking_enabled;
    if (body.requires_payment !== undefined) updateData.requiresPayment = body.requires_payment;
    if (body.is_online !== undefined) updateData.isOnline = body.is_online;
    if (body.video_provider !== undefined) updateData.videoProvider = body.video_provider;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.is_active !== undefined) updateData.isActive = body.is_active;

    // Update service
    const [updated] = await db
      .update(services)
      .set(updateData)
      .where(
        and(
          eq(services.uuid, params.id),
          eq(services.companyId, companyId),
          isNull(services.deletedAt),
        ),
      )
      .returning({
        uuid: services.uuid,
        name: services.name,
        duration_minutes: services.durationMinutes,
        price: services.price,
      });

    if (!updated) {
      throw new NotFoundError('Service not found');
    }

    return successResponse(updated);
  },
});

/**
 * Soft delete service
 */
export const DELETE = createRouteHandler({
  paramsSchema: serviceIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_DELETE],
  handler: async ({ params, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Soft delete by setting deletedAt
    const [deleted] = await db
      .update(services)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(services.uuid, params.id),
          eq(services.companyId, companyId),
          isNull(services.deletedAt),
        ),
      )
      .returning({ uuid: services.uuid });

    if (!deleted) {
      throw new NotFoundError('Service not found');
    }

    return noContentResponse();
  },
});
