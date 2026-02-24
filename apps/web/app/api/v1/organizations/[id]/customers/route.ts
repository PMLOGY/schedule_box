/**
 * Organization Cross-Location Customer API
 * GET /api/v1/organizations/[id]/customers - Cross-location customer search with email-based dedup
 *
 * Returns deduplicated customers across all organization locations.
 * Deduplication uses DISTINCT ON (COALESCE(email, phone, uuid::text)) to merge
 * customers who appear in multiple locations (same email = one record).
 *
 * Restricted to franchise_owner role.
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, users, organizations, organizationMembers } from '@schedulebox/database';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { paginatedResponse } from '@/lib/utils/response';
import { orgParamsSchema, type OrgParams } from '@/validations/organization';
import { findOrganizationCompanyIds } from '@/lib/db/org-scope';
import { z } from 'zod';

// Query parameter validation
const orgCustomerQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/v1/organizations/[id]/customers
 * Cross-location customer search with email-based deduplication
 *
 * Query params:
 *   - search: string (name, email, or phone search)
 *   - page: int (default 1)
 *   - limit: int (default 20, max 100)
 *
 * Only franchise_owner can access this endpoint.
 */
export const GET = createRouteHandler<undefined, OrgParams>({
  paramsSchema: orgParamsSchema,
  requiresAuth: true,
  handler: async ({ req, params, user }) => {
    const userSub = user?.sub ?? '';

    // 1. Resolve user internal ID
    const [dbUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, userSub))
      .limit(1);

    if (!dbUser) {
      throw new NotFoundError('User not found');
    }

    // 2. Get organization by UUID
    const [org] = await db
      .select({
        id: organizations.id,
        uuid: organizations.uuid,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.uuid, params.id))
      .limit(1);

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // 3. Verify user is franchise_owner
    const [membership] = await db
      .select({
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, org.id),
          eq(organizationMembers.userId, dbUser.id),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenError('You are not a member of this organization');
    }

    if (membership.role !== 'franchise_owner') {
      throw new ForbiddenError('Only franchise owners can access organization customers');
    }

    // 4. Get all active company IDs in org
    const companyIds = await findOrganizationCompanyIds(org.id);

    if (companyIds.length === 0) {
      return paginatedResponse([], {
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
      });
    }

    // 5. Parse query params
    const query = validateQuery(orgCustomerQuerySchema, req);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const search = query.search?.trim() || null;

    // 6. Build search condition SQL fragment
    const searchCondition = search
      ? sql`AND (
          cust.name ILIKE '%' || ${search} || '%'
          OR cust.email ILIKE '%' || ${search} || '%'
          OR cust.phone ILIKE '%' || ${search} || '%'
        )`
      : sql``;

    // 7. Query deduplicated customers across all org companies
    // Uses DISTINCT ON (COALESCE(email, phone, uuid::text)) for dedup
    // Orders by last_visit_at DESC within each dedup group to keep the most recent record
    const customersResult = await db.execute<{
      uuid: string;
      name: string;
      email: string | null;
      phone: string | null;
      total_bookings: number;
      total_spent: string;
      last_visit_at: string | null;
      locations_visited: number;
    }>(sql`
      WITH deduped AS (
        SELECT DISTINCT ON (COALESCE(cust.email, cust.phone, cust.uuid::text))
          cust.uuid,
          cust.name,
          cust.email,
          cust.phone,
          cust.total_bookings,
          cust.total_spent,
          cust.last_visit_at,
          COALESCE(cust.email, cust.phone, cust.uuid::text) AS dedup_key
        FROM customers cust
        WHERE cust.company_id = ANY(${companyIds})
          AND cust.deleted_at IS NULL
          ${searchCondition}
        ORDER BY COALESCE(cust.email, cust.phone, cust.uuid::text), cust.last_visit_at DESC NULLS LAST
      )
      SELECT
        d.uuid,
        d.name,
        d.email,
        d.phone,
        d.total_bookings,
        COALESCE(d.total_spent, '0')::text AS total_spent,
        d.last_visit_at::text,
        (
          SELECT COUNT(DISTINCT c2.company_id)::int
          FROM customers c2
          WHERE COALESCE(c2.email, c2.phone, c2.uuid::text) = d.dedup_key
            AND c2.company_id = ANY(${companyIds})
            AND c2.deleted_at IS NULL
        ) AS locations_visited
      FROM deduped d
      ORDER BY d.last_visit_at DESC NULLS LAST
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    // 8. Count total deduplicated customers for pagination
    const countResult = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT DISTINCT ON (COALESCE(cust.email, cust.phone, cust.uuid::text))
          cust.uuid
        FROM customers cust
        WHERE cust.company_id = ANY(${companyIds})
          AND cust.deleted_at IS NULL
          ${searchCondition}
        ORDER BY COALESCE(cust.email, cust.phone, cust.uuid::text), cust.last_visit_at DESC NULLS LAST
      ) sub
    `);

    const customersArray = Array.from(customersResult);

    const countArray = Array.from(countResult);
    const total = countArray.length > 0 ? Number(countArray[0].total) : 0;
    const totalPages = Math.ceil(total / limit);

    const responseData = customersArray.map((c) => ({
      uuid: c.uuid,
      name: c.name,
      email: c.email,
      phone: c.phone,
      total_bookings: Number(c.total_bookings) || 0,
      total_spent: c.total_spent,
      last_visit_at: c.last_visit_at,
      locations_visited: Number(c.locations_visited) || 1,
    }));

    return paginatedResponse(responseData, {
      total,
      page,
      limit,
      total_pages: totalPages,
    });
  },
});
