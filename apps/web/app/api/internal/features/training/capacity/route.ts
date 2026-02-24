import { type NextRequest, NextResponse } from 'next/server';
import { validateAiServiceKey } from '@/lib/middleware/ai-service-auth';
import { db } from '@schedulebox/database';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authError = validateAiServiceKey(req);
  if (authError) return authError;

  const result = await db.execute(sql`
    SELECT
      date_trunc('hour', b.start_time) AS ds,
      COUNT(*) AS y
    FROM bookings b
    WHERE b.status IN ('completed', 'confirmed', 'no_show')
    GROUP BY date_trunc('hour', b.start_time)
    ORDER BY ds ASC
  `);

  return NextResponse.json(result);
}
