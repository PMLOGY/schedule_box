/**
 * Coupon Validation Endpoint
 * POST /api/v1/coupons/validate - Validate coupon for booking application
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, coupons, customers, couponUsage } from '@schedulebox/database';
import { NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { couponValidateSchema } from '@/validations/coupon';

/**
 * POST /api/v1/coupons/validate
 * Validate coupon code against all conditions:
 * - Active status
 * - Expiration dates (validFrom, validUntil)
 * - Global usage limit (maxUses vs currentUses)
 * - Per-customer usage limit (maxUsesPerCustomer)
 * - Service applicability (applicableServiceIds)
 */
export const POST = createRouteHandler({
  bodySchema: couponValidateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Find coupon by code (already uppercase from validation) and company
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, body.code),
          eq(coupons.companyId, companyId),
          eq(coupons.isActive, true),
        ),
      )
      .limit(1);

    // If coupon not found or inactive
    if (!coupon) {
      return successResponse({
        data: {
          valid: false,
          message: 'Invalid coupon code',
        },
      });
    }

    // Check expiration: validFrom
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      return successResponse({
        data: {
          valid: false,
          message: 'Coupon not yet valid',
        },
      });
    }

    // Check expiration: validUntil
    if (coupon.validUntil && now > coupon.validUntil) {
      return successResponse({
        data: {
          valid: false,
          message: 'Coupon has expired',
        },
      });
    }

    // Check global usage limit
    if (coupon.maxUses !== null && (coupon.currentUses ?? 0) >= coupon.maxUses) {
      return successResponse({
        data: {
          valid: false,
          message: 'Coupon usage limit reached',
        },
      });
    }

    // Resolve customer UUID to internal ID
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.uuid, body.customer_id), eq(customers.companyId, companyId)))
      .limit(1);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Check per-customer usage limit
    const [usageResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(couponUsage)
      .where(and(eq(couponUsage.couponId, coupon.id), eq(couponUsage.customerId, customer.id)));

    const customerUsageCount = usageResult?.count ?? 0;
    const maxUsesPerCustomer = coupon.maxUsesPerCustomer ?? 1;

    if (customerUsageCount >= maxUsesPerCustomer) {
      return successResponse({
        data: {
          valid: false,
          message: 'You have already used this coupon',
        },
      });
    }

    // Check service applicability
    // If applicableServiceIds is not null and doesn't include the service_id, coupon is not valid
    if (
      coupon.applicableServiceIds !== null &&
      !coupon.applicableServiceIds.includes(body.service_id)
    ) {
      return successResponse({
        data: {
          valid: false,
          message: 'Coupon not valid for this service',
        },
      });
    }

    // All checks passed - coupon is valid
    return successResponse({
      data: {
        valid: true,
        discount_type: coupon.discountType,
        discount_value: Number(coupon.discountValue),
        min_booking_amount: Number(coupon.minBookingAmount),
        message: 'Coupon applied successfully',
      },
    });
  },
});
