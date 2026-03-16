/**
 * Organization Dashboard API
 * GET /api/v1/organizations/[id]/dashboard - Per-location metrics for franchise owners
 *
 * Returns per-location bookings, revenue, and occupancy for the current month,
 * plus org-level aggregates. Restricted to franchise_owner role.
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, users, organizations, organizationMembers } from '@schedulebox/database';
import { ForbiddenError, NotFoundError } from '@schedulebox/shared';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { orgParamsSchema, type OrgParams } from '@/validations/organization';
import { findOrganizationCompanyIds } from '@/lib/db/org-scope';

/**
 * GET /api/v1/organizations/[id]/dashboard
 * Per-location metrics: bookings count, revenue total for current month
 *
 * Only franchise_owner can access this endpoint.
 * location_manager is restricted from org-level dashboard.
 */
export const GET = createRouteHandler<undefined, OrgParams>({
  paramsSchema: orgParamsSchema,
  requiresAuth: true,
  handler: async ({ params, user }) => {
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

    // 3. Verify user is franchise_owner of this org
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
      throw new ForbiddenError('Only franchise owners can access the organization dashboard');
    }

    // 4. Get all active company IDs in this organization
    const companyIds = await findOrganizationCompanyIds(org.id);

    if (companyIds.length === 0) {
      return successResponse({
        organization: { uuid: org.uuid, name: org.name },
        totals: {
          bookings_count: 0,
          revenue_total: '0.00',
          locations_active: 0,
        },
        locations: [],
      });
    }

    // 5. Query per-location metrics with a single efficient query
    // Bookings count for current month per company
    // Revenue total (completed payments) for current month per company
    const locationMetrics = await db.execute<{
      company_uuid: string;
      company_name: string;
      address_city: string | null;
      bookings_count: number;
      revenue_total: string;
    }>(sql`
      SELECT
        c.uuid AS company_uuid,
        c.name AS company_name,
        c.address_city,
        COALESCE((
          SELECT COUNT(*)::int
          FROM bookings b
          WHERE b.company_id = c.id
            AND b.start_time >= date_trunc('month', NOW())
            AND b.deleted_at IS NULL
        ), 0) AS bookings_count,
        COALESCE((
          SELECT SUM(p.amount)
          FROM payments p
          WHERE p.company_id = c.id
            AND p.status = 'paid'
            AND p.created_at >= date_trunc('month', NOW())
            AND p.deleted_at IS NULL
        ), 0)::numeric(10,2)::text AS revenue_total
      FROM companies c
      WHERE c.id = ANY(${companyIds})
        AND c.is_active = true
      ORDER BY c.name ASC
    `);

    // 6. Compute org-level aggregates
    // db.execute() with Neon HTTP driver returns NeonHttpQueryResult with .rows property
    type LocationRow = {
      company_uuid: string;
      company_name: string;
      address_city: string | null;
      bookings_count: number;
      revenue_total: string;
    };
    const rawMetrics = locationMetrics as unknown as { rows?: LocationRow[] } | LocationRow[];
    const locationsArray: LocationRow[] = Array.isArray(rawMetrics)
      ? rawMetrics
      : ((rawMetrics as { rows?: LocationRow[] }).rows ?? []);

    let totalBookings = 0;
    let totalRevenue = 0;

    const locationResults = locationsArray.map((loc) => {
      const bCount = Number(loc.bookings_count) || 0;
      const rTotal = parseFloat(String(loc.revenue_total)) || 0;
      totalBookings += bCount;
      totalRevenue += rTotal;

      return {
        company_uuid: loc.company_uuid,
        company_name: loc.company_name,
        address_city: loc.address_city,
        bookings_count: bCount,
        revenue_total: rTotal.toFixed(2),
        occupancy_percent: null, // To be refined in Phase 31 Analytics
      };
    });

    return successResponse({
      organization: { uuid: org.uuid, name: org.name },
      totals: {
        bookings_count: totalBookings,
        revenue_total: totalRevenue.toFixed(2),
        locations_active: locationsArray.length,
      },
      locations: locationResults,
    });
  },
});
