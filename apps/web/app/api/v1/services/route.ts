/**
 * GET /api/v1/services
 * List services with optional filtering by category_id and is_active
 *
 * POST /api/v1/services
 * Create a new service with optional resource assignments
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db, services, serviceCategories, serviceResources } from '@schedulebox/database';
import { findCompanyId } from '@/lib/db/tenant-scope.js';
import { createRouteHandler } from '@/lib/middleware/route-handler.js';
import { successResponse, createdResponse } from '@/lib/utils/response.js';
import { PERMISSIONS } from '@/lib/middleware/rbac.js';
import { serviceCreateSchema, serviceQuerySchema } from '@/validations/service.js';

/**
 * List services
 * Filters: category_id, is_active
 * Returns services with category information
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_READ],
  handler: async ({ req, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Parse query parameters
    const url = new URL(req.url);
    const categoryIdParam = url.searchParams.get('category_id');
    const isActiveParam = url.searchParams.get('is_active');

    const query = serviceQuerySchema.parse({
      category_id: categoryIdParam,
      is_active: isActiveParam,
    });

    // Build WHERE conditions
    const conditions = [
      eq(services.companyId, companyId),
      isNull(services.deletedAt), // Only non-deleted services
    ];

    if (query.category_id !== undefined) {
      conditions.push(eq(services.categoryId, query.category_id));
    }

    if (query.is_active !== undefined) {
      conditions.push(eq(services.isActive, query.is_active === 'true'));
    }

    // Query services with category join
    const serviceList = await db
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
      .where(and(...conditions))
      .orderBy(services.sortOrder, services.name);

    return successResponse({ data: serviceList });
  },
});

/**
 * Create service
 * Optionally assigns resources via resource_ids
 */
export const POST = createRouteHandler({
  bodySchema: serviceCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.SERVICES_CREATE],
  handler: async ({ body, user }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get company scope
    const { companyId } = await findCompanyId(user.sub);

    // Extract resource_ids before creating service
    const { resource_ids, ...serviceData } = body;

    // Create service in transaction
    const result = await db.transaction(async (tx) => {
      // Insert service
      const [service] = await tx
        .insert(services)
        .values({
          companyId,
          categoryId: serviceData.category_id,
          name: serviceData.name,
          description: serviceData.description,
          durationMinutes: serviceData.duration_minutes,
          bufferBeforeMinutes: serviceData.buffer_before_minutes ?? 0,
          bufferAfterMinutes: serviceData.buffer_after_minutes ?? 0,
          price: serviceData.price.toString(),
          dynamicPricingEnabled: serviceData.dynamic_pricing_enabled ?? false,
          priceMin: serviceData.price_min?.toString(),
          priceMax: serviceData.price_max?.toString(),
          maxCapacity: serviceData.max_capacity ?? 1,
          onlineBookingEnabled: serviceData.online_booking_enabled ?? true,
          requiresPayment: serviceData.requires_payment ?? false,
          isOnline: serviceData.is_online ?? false,
          videoProvider: serviceData.video_provider,
          color: serviceData.color ?? '#3B82F6',
        })
        .returning({
          id: services.id,
          uuid: services.uuid,
          name: services.name,
          duration_minutes: services.durationMinutes,
          price: services.price,
        });

      // Insert resource assignments if provided
      if (resource_ids && resource_ids.length > 0) {
        await tx.insert(serviceResources).values(
          resource_ids.map((resourceId) => ({
            serviceId: service.id,
            resourceId,
            quantityNeeded: 1, // Default quantity
          })),
        );
      }

      return service;
    });

    return createdResponse({
      uuid: result.uuid,
      name: result.name,
      duration_minutes: result.duration_minutes,
      price: result.price,
    });
  },
});
