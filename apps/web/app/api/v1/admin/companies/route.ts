/**
 * Platform Admin Companies API
 * GET /api/v1/admin/companies - List all companies with aggregated stats
 * PUT /api/v1/admin/companies - Activate or deactivate a company by UUID
 *
 * Cross-tenant endpoint (no company scope). Requires admin role.
 */

import { sql, desc, eq } from 'drizzle-orm';
import { db, companies } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { paginatedResponse, successResponse } from '@/lib/utils/response';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { z } from 'zod';

/**
 * GET /api/v1/admin/companies
 *
 * Returns paginated list of all companies with per-company stats:
 * - User count, booking count, revenue (from completed bookings)
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 *
 * Authorization: admin role only (403 for non-admin)
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ req, user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)), 100);
    const offset = (page - 1) * limit;

    // Get companies with aggregated stats via correlated subqueries
    const companiesList = await db
      .select({
        id: companies.id,
        uuid: companies.uuid,
        name: companies.name,
        slug: companies.slug,
        email: companies.email,
        subscriptionPlan: companies.subscriptionPlan,
        isActive: companies.isActive,
        createdAt: companies.createdAt,
        userCount: sql<number>`(SELECT count(*)::int FROM users WHERE company_id = ${companies.id})`,
        bookingCount: sql<number>`(SELECT count(*)::int FROM bookings WHERE company_id = ${companies.id})`,
        revenue: sql<string>`(SELECT coalesce(sum(price), 0) FROM bookings WHERE company_id = ${companies.id} AND status = 'completed')`,
      })
      .from(companies)
      .orderBy(desc(companies.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count for pagination
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companies);

    return paginatedResponse(
      companiesList.map((c) => ({
        uuid: c.uuid,
        name: c.name,
        slug: c.slug,
        email: c.email,
        subscription_plan: c.subscriptionPlan,
        is_active: c.isActive,
        created_at: c.createdAt,
        user_count: c.userCount,
        booking_count: c.bookingCount,
        revenue: c.revenue,
      })),
      {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    );
  },
});

// ---- PUT: Activate / Deactivate Company ----

const updateCompanySchema = z.object({
  uuid: z.string().uuid(),
  is_active: z.boolean(),
});

/**
 * PUT /api/v1/admin/companies
 *
 * Activate or deactivate a company by UUID.
 *
 * Body: { uuid: string, is_active: boolean }
 *
 * Authorization: admin role only (403 for non-admin)
 */
export const PUT = createRouteHandler({
  requiresAuth: true,
  bodySchema: updateCompanySchema,
  handler: async ({ body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const [existingCompany] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.uuid, body.uuid))
      .limit(1);

    if (!existingCompany) {
      throw new NotFoundError('Company not found');
    }

    await db
      .update(companies)
      .set({ isActive: body.is_active, updatedAt: new Date() })
      .where(eq(companies.uuid, body.uuid));

    return successResponse({ success: true });
  },
});
