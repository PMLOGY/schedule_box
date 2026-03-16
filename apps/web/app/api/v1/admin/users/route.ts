/**
 * Platform Admin Users API
 * GET  /api/v1/admin/users - List all users with role and company info
 * PUT  /api/v1/admin/users - Activate or deactivate a user by UUID
 *
 * Cross-tenant endpoint (no company scope). Requires admin role.
 */

import { sql, eq, desc, and, ilike } from 'drizzle-orm';
import { db, users, roles, companies } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { paginatedResponse, successResponse } from '@/lib/utils/response';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { z } from 'zod';

/**
 * GET /api/v1/admin/users
 *
 * Returns paginated list of all users with their role and company.
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - role: string (optional filter by role name: admin, owner, employee, customer)
 * - search: string (optional search by name or email)
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
    const roleFilter = url.searchParams.get('role') || undefined;
    const search = url.searchParams.get('search') || undefined;

    // Build dynamic WHERE conditions
    const conditions = [];
    if (roleFilter) {
      conditions.push(eq(roles.name, roleFilter));
    }
    if (search) {
      conditions.push(
        sql`(${ilike(users.name, `%${search}%`)} OR ${ilike(users.email, `%${search}%`)})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get users with role and company info
    const usersList = await db
      .select({
        uuid: users.uuid,
        email: users.email,
        name: users.name,
        phone: users.phone,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        roleName: roles.name,
        companyName: companies.name,
        companyUuid: companies.uuid,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count (with same filters applied for accurate pagination)
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(whereClause);

    return paginatedResponse(
      usersList.map((u) => ({
        uuid: u.uuid,
        email: u.email,
        name: u.name,
        phone: u.phone,
        is_active: u.isActive,
        email_verified: u.emailVerified,
        last_login_at: u.lastLoginAt,
        created_at: u.createdAt,
        role: u.roleName,
        company_name: u.companyName,
        company_uuid: u.companyUuid,
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

// ---- PUT: Activate / Deactivate User ----

const updateUserSchema = z.object({
  uuid: z.string().uuid(),
  is_active: z.boolean(),
});

/**
 * PUT /api/v1/admin/users
 *
 * Activate or deactivate a user by UUID.
 *
 * Body: { uuid: string, is_active: boolean }
 *
 * Authorization: admin role only (403 for non-admin)
 */
export const PUT = createRouteHandler({
  requiresAuth: true,
  bodySchema: updateUserSchema,
  handler: async ({ body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, body.uuid))
      .limit(1);

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    await db
      .update(users)
      .set({ isActive: body.is_active, updatedAt: new Date() })
      .where(eq(users.uuid, body.uuid));

    return successResponse({ success: true });
  },
});
