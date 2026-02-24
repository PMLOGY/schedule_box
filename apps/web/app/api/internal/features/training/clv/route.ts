import { type NextRequest, NextResponse } from 'next/server';
import { validateAiServiceKey } from '@/lib/middleware/ai-service-auth';
import { db } from '@schedulebox/database';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = validateAiServiceKey(req);
  if (authError) return authError;

  const result = await db.execute(sql`
    SELECT
      agg.total_bookings,
      agg.total_spent,
      agg.avg_booking_value,
      EXTRACT(DAY FROM NOW() - agg.first_visit) AS days_since_first_visit,
      EXTRACT(DAY FROM NOW() - agg.last_visit) AS days_since_last_visit,
      CASE
        WHEN agg.days_active > 0
        THEN agg.total_bookings::float / (agg.days_active / 30.0)
        ELSE 0
      END AS booking_frequency,
      agg.no_show_rate,
      agg.service_diversity,
      agg.total_spent * (1 + LN(
        CASE
          WHEN agg.days_active > 0
          THEN agg.total_bookings::float / (agg.days_active / 30.0) + 1
          ELSE 1
        END
      )) * (1 - agg.no_show_rate) AS future_clv
    FROM (
      SELECT
        c.id AS customer_id,
        COUNT(b.id) AS total_bookings,
        COALESCE(SUM(b.price::numeric), 0) AS total_spent,
        COALESCE(AVG(b.price::numeric), 0) AS avg_booking_value,
        MIN(b.start_time) AS first_visit,
        MAX(b.start_time) AS last_visit,
        EXTRACT(DAY FROM MAX(b.start_time) - MIN(b.start_time)) AS days_active,
        COUNT(*) FILTER (WHERE b.status = 'no_show')::float / NULLIF(COUNT(*), 0) AS no_show_rate,
        COUNT(DISTINCT b.service_id) AS service_diversity
      FROM customers c
      JOIN bookings b ON b.customer_id = c.id
      WHERE b.status IN ('completed', 'no_show')
      GROUP BY c.id
      HAVING COUNT(b.id) >= 2
    ) agg
    LIMIT 5000
  `);

  return NextResponse.json(result);
}
