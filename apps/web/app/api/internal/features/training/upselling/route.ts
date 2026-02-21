import { type NextRequest, NextResponse } from 'next/server';
import { validateAiServiceKey } from '@/lib/middleware/ai-service-auth';
import { db } from '@schedulebox/database';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = validateAiServiceKey(req);
  if (authError) return authError;

  const result = await db.execute(sql`
    SELECT
      b1.service_id AS service_a_id,
      b2.service_id AS service_b_id,
      COUNT(*) AS co_booking_count
    FROM bookings b1
    JOIN bookings b2
      ON b1.customer_id = b2.customer_id
      AND b1.service_id < b2.service_id
    WHERE b1.status = 'completed'
      AND b2.status = 'completed'
    GROUP BY b1.service_id, b2.service_id
    ORDER BY co_booking_count DESC
    LIMIT 10000
  `);

  return NextResponse.json(result);
}
