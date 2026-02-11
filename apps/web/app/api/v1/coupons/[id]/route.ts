/**
 * Individual Coupon Endpoints
 * GET    /api/v1/coupons/[id] - Get coupon details
 * PUT    /api/v1/coupons/[id] - Update coupon
 * DELETE /api/v1/coupons/[id] - Delete coupon
 */

import { eq, and } from 'drizzle-orm';
import { db, coupons } from '@schedulebox/database';
import { NotFoundError, ConflictError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse, noContentResponse } from '@/lib/utils/response';
import { couponIdParamSchema, couponUpdateSchema } from '@/validations/coupon';

/**
 * GET /api/v1/coupons/[id]
 * Get coupon details by UUID
 */
export const GET = createRouteHandler({
  paramsSchema: couponIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find coupon by UUID and company
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.uuid, params.id), eq(coupons.companyId, companyId)))
      .limit(1);

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    // Return coupon data (use UUID as id)
    return successResponse({
      id: coupon.uuid,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discountType,
      discount_value: Number(coupon.discountValue),
      min_booking_amount: Number(coupon.minBookingAmount),
      max_uses: coupon.maxUses,
      current_uses: coupon.currentUses,
      max_uses_per_customer: coupon.maxUsesPerCustomer,
      applicable_service_ids: coupon.applicableServiceIds,
      valid_from: coupon.validFrom?.toISOString(),
      valid_until: coupon.validUntil?.toISOString(),
      is_active: coupon.isActive,
      created_at: coupon.createdAt?.toISOString(),
      updated_at: coupon.updatedAt?.toISOString(),
    });
  },
});

/**
 * PUT /api/v1/coupons/[id]
 * Update coupon details
 */
export const PUT = createRouteHandler({
  paramsSchema: couponIdParamSchema,
  bodySchema: couponUpdateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ params, body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find coupon by UUID and company
    const [existingCoupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.uuid, params.id), eq(coupons.companyId, companyId)))
      .limit(1);

    if (!existingCoupon) {
      throw new NotFoundError('Coupon not found');
    }

    // If code is being changed, check for duplicate
    if (body.code && body.code !== existingCoupon.code) {
      const [duplicate] = await db
        .select({ id: coupons.id })
        .from(coupons)
        .where(and(eq(coupons.companyId, companyId), eq(coupons.code, body.code)))
        .limit(1);

      if (duplicate) {
        throw new ConflictError('Coupon code already exists');
      }
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.code !== undefined) updateData.code = body.code;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.discount_type !== undefined) updateData.discountType = body.discount_type;
    if (body.discount_value !== undefined)
      updateData.discountValue = body.discount_value.toString();
    if (body.min_booking_amount !== undefined)
      updateData.minBookingAmount = body.min_booking_amount.toString();
    if (body.max_uses !== undefined) updateData.maxUses = body.max_uses;
    if (body.max_uses_per_customer !== undefined)
      updateData.maxUsesPerCustomer = body.max_uses_per_customer;
    if (body.applicable_service_ids !== undefined)
      updateData.applicableServiceIds = body.applicable_service_ids;
    if (body.valid_from !== undefined) updateData.validFrom = new Date(body.valid_from);
    if (body.valid_until !== undefined) updateData.validUntil = new Date(body.valid_until);
    if (body.is_active !== undefined) updateData.isActive = body.is_active;

    // Update coupon
    const [updatedCoupon] = await db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.id, existingCoupon.id))
      .returning();

    // Return updated coupon (use UUID as id)
    return successResponse({
      id: updatedCoupon.uuid,
      code: updatedCoupon.code,
      description: updatedCoupon.description,
      discount_type: updatedCoupon.discountType,
      discount_value: Number(updatedCoupon.discountValue),
      min_booking_amount: Number(updatedCoupon.minBookingAmount),
      max_uses: updatedCoupon.maxUses,
      current_uses: updatedCoupon.currentUses,
      max_uses_per_customer: updatedCoupon.maxUsesPerCustomer,
      applicable_service_ids: updatedCoupon.applicableServiceIds,
      valid_from: updatedCoupon.validFrom?.toISOString(),
      valid_until: updatedCoupon.validUntil?.toISOString(),
      is_active: updatedCoupon.isActive,
      created_at: updatedCoupon.createdAt?.toISOString(),
      updated_at: updatedCoupon.updatedAt?.toISOString(),
    });
  },
});

/**
 * DELETE /api/v1/coupons/[id]
 * Hard delete coupon (CASCADE removes coupon_usage records)
 */
export const DELETE = createRouteHandler({
  paramsSchema: couponIdParamSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ params, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find coupon by UUID and company
    const [existingCoupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.uuid, params.id), eq(coupons.companyId, companyId)))
      .limit(1);

    if (!existingCoupon) {
      throw new NotFoundError('Coupon not found');
    }

    // Hard delete the coupon (CASCADE will remove coupon_usage records)
    await db.delete(coupons).where(eq(coupons.id, existingCoupon.id));

    return noContentResponse();
  },
});
