import { type NextRequest, NextResponse } from 'next/server';
import { validateAiServiceKey } from '@/lib/middleware/ai-service-auth';
import { db } from '@schedulebox/database';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = validateAiServiceKey(req);
  if (authError) return authError;

  const result = await db.execute(sql`
    SELECT
      EXTRACT(EPOCH FROM (b.start_time - b.created_at)) / 3600 AS booking_lead_time_hours,
      COALESCE(cust_stats.no_show_rate, 0.15) AS customer_no_show_rate,
      COALESCE(cust_stats.total_bookings, 1) AS customer_total_bookings,
      EXTRACT(DOW FROM b.start_time) AS day_of_week,
      EXTRACT(HOUR FROM b.start_time) AS hour_of_day,
      CASE WHEN EXTRACT(DOW FROM b.start_time) IN (0, 6) THEN 1 ELSE 0 END AS is_weekend,
      s.duration_minutes AS service_duration_minutes,
      s.price AS service_price,
      CASE WHEN cust_stats.total_bookings = 1 THEN 1 ELSE 0 END AS is_first_visit,
      CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END AS has_payment,
      COALESCE(days_since.days, 999) AS days_since_last_visit,
      CASE WHEN b.status = 'no_show' THEN 1 ELSE 0 END AS no_show
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'no_show')::float / NULLIF(COUNT(*), 0) AS no_show_rate
      FROM bookings
      WHERE customer_id = b.customer_id AND id != b.id
    ) cust_stats ON true
    LEFT JOIN LATERAL (
      SELECT EXTRACT(DAY FROM b.start_time - MAX(prev.start_time)) AS days
      FROM bookings prev
      WHERE prev.customer_id = b.customer_id AND prev.id != b.id
    ) days_since ON true
    WHERE b.status IN ('completed', 'no_show')
    LIMIT 5000
  `);

  return NextResponse.json(result);
}
