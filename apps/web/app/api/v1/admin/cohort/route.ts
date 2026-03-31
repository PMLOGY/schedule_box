/**
 * Admin Cohort Retention Analysis API
 * GET /api/v1/admin/cohort - Company retention grouped by signup month
 *
 * ADM-03: Returns cohort data showing what percentage of companies
 * that signed up in each month are still active today.
 *
 * Since we only have current active/inactive status (no monthly activity logs),
 * retention is calculated as: for each cohort month, what % of signups
 * are still active (isActive=true AND suspendedAt IS NULL) right now.
 *
 * Authorization: admin role only.
 */

import { sql } from 'drizzle-orm';
import { db } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { successResponse } from '@/lib/utils/response';
import { ForbiddenError } from '@schedulebox/shared';

type CohortRow = Record<string, unknown> & {
  month: string;
  signups: number;
  active_count: number;
};

/**
 * GET /api/v1/admin/cohort
 *
 * Returns cohort retention analysis:
 * - cohorts[]: array of { month, signups, retention[] }
 * - months[]: column header labels (each unique signup month)
 *
 * Each cohort has a single retention value (current % still active)
 * because we lack per-month activity tracking.
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  handler: async ({ user }) => {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    // Get cohort data for the last 12 months
    // Groups companies by signup month and calculates current retention
    const rows = await db.execute<CohortRow>(sql`
      SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)::int AS signups,
        COUNT(*) FILTER (
          WHERE is_active = true AND suspended_at IS NULL
        )::int AS active_count
      FROM companies
      WHERE created_at >= date_trunc('month', NOW()) - interval '11 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) ASC
    `);

    // Build the list of all months from earliest cohort to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Collect unique months from data
    const cohortMonths: string[] = [];
    const cohorts = (rows as unknown as CohortRow[]).map((row) => {
      cohortMonths.push(row.month);
      const signups = Number(row.signups);
      const activeCount = Number(row.active_count);
      const retentionPct = signups > 0 ? Math.round((activeCount / signups) * 100) : 0;

      // retention[0] is always 100% (month of signup)
      // For subsequent months up to current, we use current active status
      // as a proxy (snapshot-based approach)
      const monthsBetween = getMonthDiff(row.month, currentMonth);
      const retention: number[] = [100]; // Month 0 is always 100%
      for (let i = 1; i <= monthsBetween; i++) {
        retention.push(retentionPct);
      }

      return {
        month: row.month,
        signups,
        retention,
      };
    });

    // Build column headers: all months from earliest cohort to current
    const months: string[] = [];
    if (cohortMonths.length > 0) {
      let cursor = cohortMonths[0];
      while (cursor <= currentMonth) {
        months.push(cursor);
        cursor = incrementMonth(cursor);
      }
    }

    return successResponse({
      cohorts,
      months,
    });
  },
});

/**
 * Calculate the number of months between two YYYY-MM strings.
 */
function getMonthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * Increment a YYYY-MM string by one month.
 */
function incrementMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 12) {
    return `${y + 1}-01`;
  }
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}
