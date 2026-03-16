/**
 * AI Insights API Endpoint
 * GET /api/v1/ai/insights
 *
 * Returns a daily digest of high-risk bookings and optimization suggestions
 * for the company dashboard. Also provides AI activation status based on
 * total company booking count (threshold: 10).
 */

import { sql } from 'drizzle-orm';
import { db } from '@schedulebox/database';
import { createRouteHandler } from '@/lib/middleware/route-handler';
import { findCompanyId } from '@/lib/db/tenant-scope';
import { PERMISSIONS } from '@/lib/middleware/rbac';
import { successResponse } from '@/lib/utils/response';

const AI_ACTIVATION_THRESHOLD = 10;

interface HighRiskBookingRow extends Record<string, unknown> {
  booking_id: string;
  customer_name: string;
  service_name: string;
  start_time: string;
  no_show_probability: number;
}

interface CountRow extends Record<string, unknown> {
  count: string;
}

/**
 * GET /api/v1/ai/insights
 * Returns today's high-risk bookings, suggestions, and AI activation status.
 * Permission: bookings.read
 */
export const GET = createRouteHandler({
  requiresAuth: true,
  requiredPermissions: [PERMISSIONS.BOOKINGS_READ],
  handler: async ({ user }) => {
    const userSub = user?.sub ?? '';
    const { companyId } = await findCompanyId(userSub);

    // Query 1: Today's high-risk bookings (no_show_probability >= 0.30)
    const highRiskRows = await db.execute<HighRiskBookingRow>(sql`
      SELECT b.uuid AS booking_id,
             c.name AS customer_name,
             s.name AS service_name,
             b.start_time,
             b.no_show_probability
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      JOIN services s ON s.id = b.service_id
      WHERE b.company_id = ${companyId}
        AND b.status IN ('pending', 'confirmed')
        AND b.start_time >= NOW()
        AND b.start_time < NOW() + INTERVAL '24 hours'
        AND b.no_show_probability IS NOT NULL
        AND b.no_show_probability >= 0.30
      ORDER BY b.no_show_probability DESC
      LIMIT 10
    `);

    // Query 2: Total company bookings (for AI activation threshold)
    const totalCompanyResult = await db.execute<CountRow>(sql`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE company_id = ${companyId}
        AND status IN ('completed', 'confirmed', 'no_show', 'pending')
    `);
    const totalCompanyRow = totalCompanyResult.rows[0];

    // Query 3: Today's total upcoming bookings
    const todayTotalResult = await db.execute<CountRow>(sql`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE company_id = ${companyId}
        AND status IN ('pending', 'confirmed')
        AND start_time >= NOW()
        AND start_time < NOW() + INTERVAL '24 hours'
    `);
    const todayTotalRow = todayTotalResult.rows[0];

    const totalCompanyBookings = parseInt(totalCompanyRow?.count ?? '0', 10);
    const totalTodayBookings = parseInt(todayTotalRow?.count ?? '0', 10);
    const aiActive = totalCompanyBookings >= AI_ACTIVATION_THRESHOLD;

    // Map high-risk bookings with computed riskLevel
    const highRiskBookings = highRiskRows.rows.map((row) => {
      const probability = parseFloat(String(row.no_show_probability));
      return {
        bookingId: row.booking_id,
        customerName: row.customer_name,
        serviceName: row.service_name,
        startTime: row.start_time,
        noShowProbability: probability,
        riskLevel: (probability >= 0.5 ? 'high' : 'medium') as 'high' | 'medium',
      };
    });

    const highRiskCount = highRiskBookings.length;

    // Generate suggestions server-side based on actual data
    const suggestions: string[] = [];
    if (highRiskCount > 0) {
      suggestions.push(
        `Doporucujeme odeslat SMS pripominky ${highRiskCount} zakaznikum s vysokym rizikem nedostaveni`,
      );
    }
    if (highRiskCount > 3) {
      suggestions.push(`Zvazite dvojitou konfirmaci pro zakaziky s rizikem nad 50%`);
    }
    if (totalTodayBookings === 0) {
      suggestions.push(`Na dnes nemáte zadne nadchazejici rezervace`);
    }

    return successResponse({
      highRiskBookings,
      totalTodayBookings,
      highRiskCount,
      aiActive,
      totalCompanyBookings,
      suggestions,
    });
  },
});
