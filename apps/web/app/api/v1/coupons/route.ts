/**
 * Coupon List and Create Endpoints
 * GET  /api/v1/coupons - List coupons with pagination, search, and is_active filter
 * POST /api/v1/coupons - Create new coupon
 */

import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { db, coupons } from '@schedulebox/database';
import { ConflictError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { createdResponse, paginatedResponse } from '@/lib/utils/response';
import { couponCreateSchema, couponQuerySchema, type CouponQuery } from '@/validations/coupon';

/**
 * GET /api/v1/coupons
 * List coupons with pagination, search, and is_active filter
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ req, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Parse and validate query parameters
    const query = validateQuery(couponQuerySchema, req) as CouponQuery;
    const { page, limit, search, is_active } = query;

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Build base WHERE conditions (company scoped)
    const baseConditions = [eq(coupons.companyId, companyId)];

    // Add search condition (search in code and description)
    if (search) {
      const searchTerm = `%${search}%`;
      const searchCondition = or(
        ilike(coupons.code, searchTerm),
        ilike(coupons.description, searchTerm),
      );
      if (searchCondition) {
        baseConditions.push(searchCondition);
      }
    }

    // Add is_active filter if provided
    if (is_active !== undefined) {
      baseConditions.push(eq(coupons.isActive, is_active));
    }

    // Query coupons with pagination
    const data = await db
      .select()
      .from(coupons)
      .where(and(...baseConditions))
      .orderBy(sql`${coupons.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    // Get total count for pagination metadata
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(coupons)
      .where(and(...baseConditions));

    const totalCount = countResult.count;

    // Map to response format (use UUID, not SERIAL id)
    const responseData = data.map((coupon) => ({
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
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return paginatedResponse(responseData, {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
    });
  },
});

/**
 * POST /api/v1/coupons
 * Create new coupon with duplicate code check
 */
export const POST = createRouteHandler({
  bodySchema: couponCreateSchema,
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.COUPONS_MANAGE],
  handler: async ({ body, user }) => {
    // Find user's company ID for tenant isolation
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Check for duplicate code within company
    const [existing] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(and(eq(coupons.companyId, companyId), eq(coupons.code, body.code)))
      .limit(1);

    if (existing) {
      throw new ConflictError('Coupon code already exists');
    }

    // Insert coupon
    const [coupon] = await db
      .insert(coupons)
      .values({
        companyId,
        code: body.code,
        description: body.description,
        discountType: body.discount_type,
        discountValue: body.discount_value.toString(),
        minBookingAmount: (body.min_booking_amount ?? 0).toString(),
        maxUses: body.max_uses,
        maxUsesPerCustomer: body.max_uses_per_customer,
        applicableServiceIds: body.applicable_service_ids,
        validFrom: body.valid_from ? new Date(body.valid_from) : undefined,
        validUntil: body.valid_until ? new Date(body.valid_until) : undefined,
        isActive: body.is_active,
      })
      .returning();

    // Return created coupon (use UUID, not SERIAL id)
    return createdResponse({
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
