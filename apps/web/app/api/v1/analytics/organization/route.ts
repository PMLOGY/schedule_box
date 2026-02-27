/**
 * Cross-Location Organization Analytics API
 * GET /api/v1/analytics/organization - Aggregate analytics for franchise owners
 *
 * ANLYT-05: Cross-location aggregate analytics with per-location breakdown.
 * Requires franchise_owner role in an organization.
 */

import { eq, and, gte, sql, inArray } from 'drizzle-orm';
import {
  db,
  organizations,
  organizationMembers,
  companies,
  bookings,
  employees,
  users,
} from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { validateQuery } from '@/lib/middleware/validate';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@schedulebox/shared';
import { z } from 'zod';

// Query parameter validation
const orgAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

/**
 * GET /api/v1/analytics/organization
 *
 * Returns aggregate analytics across all locations in a franchise owner's organization:
 * - Organization-level totals (revenue, bookings, customers)
 * - Per-location breakdown with occupancy approximation
 *
 * Authorization: franchise_owner in an organization (403 otherwise)
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ req, user }) => {
    if (!user) {
      throw new ForbiddenError('Organization access required');
    }

    // Parse query params
    const query = validateQuery(orgAnalyticsQuerySchema, req);
    const days = query.days ?? 30;

    // Calculate date boundary
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Resolve user's internal ID from UUID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uuid, user.sub))
      .limit(1);

    if (!userRecord) {
      throw new ForbiddenError('Organization access required');
    }

    // Find user's franchise_owner membership
    const [membership] = await db
      .select({
        organizationId: organizationMembers.organizationId,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userRecord.id),
          eq(organizationMembers.role, 'franchise_owner'),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenError('Organization access required');
    }

    // Get organization details
    const [org] = await db
      .select({
        uuid: organizations.uuid,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, membership.organizationId))
      .limit(1);

    if (!org) {
      throw new ForbiddenError('Organization access required');
    }

    // Get all active company IDs in the organization
    const orgCompanies = await db
      .select({
        id: companies.id,
        uuid: companies.uuid,
        name: companies.name,
      })
      .from(companies)
      .where(
        and(eq(companies.organizationId, membership.organizationId), eq(companies.isActive, true)),
      );

    if (orgCompanies.length === 0) {
      return successResponse({
        organizationId: org.uuid,
        organizationName: org.name,
        totals: {
          totalRevenue: 0,
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          noShows: 0,
          uniqueCustomers: 0,
        },
        locations: [],
      });
    }

    const companyIds = orgCompanies.map((c) => c.id);

    // ---- Organization-level totals ----
    const [orgTotals] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(
          CASE WHEN ${bookings.status} = 'completed'
            THEN (${bookings.price}::numeric - ${bookings.discountAmount}::numeric)
            ELSE 0
          END
        ), 0)`,
        totalBookings: sql<number>`COUNT(*)`,
        completedBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'completed')`,
        cancelledBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`,
        noShows: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')`,
        uniqueCustomers: sql<number>`COUNT(DISTINCT ${bookings.customerId})`,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.companyId, companyIds),
          gte(bookings.startTime, daysAgo),
          sql`${bookings.deletedAt} IS NULL`,
        ),
      );

    // ---- Per-location breakdown ----
    const locationStats = await db
      .select({
        companyId: bookings.companyId,
        totalRevenue: sql<number>`COALESCE(SUM(
          CASE WHEN ${bookings.status} = 'completed'
            THEN (${bookings.price}::numeric - ${bookings.discountAmount}::numeric)
            ELSE 0
          END
        ), 0)`,
        totalBookings: sql<number>`COUNT(*)`,
        completedBookings: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'completed')`,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.companyId, companyIds),
          gte(bookings.startTime, daysAgo),
          sql`${bookings.deletedAt} IS NULL`,
        ),
      )
      .groupBy(bookings.companyId);

    // Get active employee counts per company for occupancy approximation
    const employeeCounts = await db
      .select({
        companyId: employees.companyId,
        count: sql<number>`COUNT(*)`,
      })
      .from(employees)
      .where(and(inArray(employees.companyId, companyIds), eq(employees.isActive, true)))
      .groupBy(employees.companyId);

    const employeeCountMap = new Map(employeeCounts.map((e) => [e.companyId, Number(e.count)]));

    const locationStatsMap = new Map(locationStats.map((s) => [s.companyId, s]));

    // Build per-location response
    // Occupancy approximation V1: (completedBookings * avgDuration) / (employees * workingDays * 480)
    // avgDuration assumed 60 min, workingDays = days period (capped at actual working days)
    const workingDays = Math.ceil(days * (5 / 7)); // approximate working days in period
    const avgBookingDurationMin = 60; // V1 approximation

    const locations = orgCompanies.map((company) => {
      const stats = locationStatsMap.get(company.id);
      const empCount = employeeCountMap.get(company.id) ?? 1; // avoid division by zero
      const completedBookings = stats ? Number(stats.completedBookings) : 0;

      // Occupancy = (completedBookings * avgDuration) / (employees * workingDays * 480 min/day)
      const totalCapacityMin = empCount * workingDays * 480;
      const occupancyApprox =
        totalCapacityMin > 0
          ? Math.min(
              100,
              Math.round(((completedBookings * avgBookingDurationMin) / totalCapacityMin) * 10000) /
                100,
            )
          : 0;

      return {
        companyId: company.uuid,
        companyName: company.name,
        totalRevenue: stats ? Math.round(Number(stats.totalRevenue) * 100) / 100 : 0,
        totalBookings: stats ? Number(stats.totalBookings) : 0,
        completedBookings,
        occupancyApprox,
      };
    });

    return successResponse({
      organizationId: org.uuid,
      organizationName: org.name,
      totals: {
        totalRevenue: Math.round(Number(orgTotals.totalRevenue) * 100) / 100,
        totalBookings: Number(orgTotals.totalBookings),
        completedBookings: Number(orgTotals.completedBookings),
        cancelledBookings: Number(orgTotals.cancelledBookings),
        noShows: Number(orgTotals.noShows),
        uniqueCustomers: Number(orgTotals.uniqueCustomers),
      },
      locations,
    });
  },
});
