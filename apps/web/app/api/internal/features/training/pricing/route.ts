import { type NextRequest, NextResponse } from 'next/server';
import { validateAiServiceKey } from '@/lib/middleware/ai-service-auth';
import { db } from '@schedulebox/database';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = validateAiServiceKey(req);
  if (authError) return authError;

  const result = await db.execute(sql`
    SELECT
      b.service_id,
      b.price AS price_charged,
      EXTRACT(DOW FROM b.start_time) AS day_of_week,
      EXTRACT(HOUR FROM b.start_time) AS hour_of_day,
      b.status AS booking_status,
      COALESCE(hourly.booking_count, 1)::float / 5.0 AS utilization_estimate
    FROM bookings b
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS booking_count
      FROM bookings b2
      WHERE date_trunc('hour', b2.start_time) = date_trunc('hour', b.start_time)
        AND b2.company_id = b.company_id
    ) hourly ON true
    WHERE b.status IN ('completed', 'no_show')
    LIMIT 5000
  `);

  return NextResponse.json(result);
}
