import { type NextRequest, NextResponse } from 'next/server';
import { validateAiServiceKey } from '@/lib/middleware/ai-service-auth';
import { db } from '@schedulebox/database';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = validateAiServiceKey(req);
  if (authError) return authError;

  const result = await db.execute(sql`
    SELECT
      n.customer_id,
      n.channel AS notification_channel,
      EXTRACT(EPOCH FROM (b.start_time - n.sent_at)) / 60 AS minutes_before_booking,
      CASE WHEN n.opened_at IS NOT NULL THEN true ELSE false END AS was_opened,
      b.status AS booking_status
    FROM notifications n
    JOIN bookings b ON b.id = n.booking_id
    WHERE n.status IN ('sent', 'delivered', 'opened', 'clicked')
      AND n.booking_id IS NOT NULL
      AND n.customer_id IS NOT NULL
      AND n.sent_at IS NOT NULL
    LIMIT 5000
  `);

  return NextResponse.json(result);
}
