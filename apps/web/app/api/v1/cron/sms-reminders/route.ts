/**
 * SMS Reminder Cron Endpoint
 * GET /api/v1/cron/sms-reminders
 *
 * Invoked by Vercel Cron every 15 minutes.
 * Queries pending SMS notifications whose scheduledAt is within the current
 * processing window (up to 30 minutes past), sends them via Twilio, and
 * updates their status to sent/failed.
 *
 * Security: validates Authorization: Bearer ${CRON_SECRET} header.
 *
 * Required environment variables:
 *   CRON_SECRET         — shared secret for cron invocation authentication
 *   TWILIO_ACCOUNT_SID  — Twilio account SID
 *   TWILIO_AUTH_TOKEN   — Twilio auth token
 *   TWILIO_FROM_NUMBER  — Twilio sending number
 */

import { eq, and, lte, gte } from 'drizzle-orm';
import { db, notifications } from '@schedulebox/database';
import { NextResponse } from 'next/server';
import { sendSMS } from '@/lib/sms/twilio-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BATCH_SIZE = 50;

/**
 * GET /api/v1/cron/sms-reminders
 * Process pending SMS reminders within the current time window.
 */
export async function GET(req: Request): Promise<NextResponse> {
  // Security: validate CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  // 30-minute lookback window to catch reminders missed in the previous cycle
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000);

  // Query pending SMS notifications within the processing window
  const pendingReminders = await db
    .select({
      id: notifications.id,
      recipient: notifications.recipient,
      body: notifications.body,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.channel, 'sms'),
        eq(notifications.status, 'pending'),
        lte(notifications.scheduledAt, now),
        gte(notifications.scheduledAt, windowStart),
      ),
    )
    .limit(BATCH_SIZE);

  let sent = 0;
  let failed = 0;

  for (const reminder of pendingReminders) {
    try {
      await sendSMS(reminder.recipient, reminder.body);

      await db
        .update(notifications)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(notifications.id, reminder.id));

      sent++;
    } catch (err) {
      console.error(`[CronSmsReminders] Failed to send SMS to ${reminder.recipient}:`, err);

      await db
        .update(notifications)
        .set({ status: 'failed', errorMessage: String(err) })
        .where(eq(notifications.id, reminder.id));

      failed++;
    }
  }

  const processed = pendingReminders.length;

  console.log(`[CronSmsReminders] Processed: ${processed}, Sent: ${sent}, Failed: ${failed}`);

  return NextResponse.json({ processed, sent, failed });
}
