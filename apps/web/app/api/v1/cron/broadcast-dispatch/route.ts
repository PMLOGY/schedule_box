/**
 * Broadcast Dispatch Cron Endpoint
 * GET /api/v1/cron/broadcast-dispatch
 *
 * Invoked by Vercel Cron every 5 minutes.
 * Queries pending broadcasts whose scheduledAt <= NOW and sentAt IS NULL,
 * sends emails to all matching active non-suspended companies, then marks
 * the broadcast as sent.
 *
 * Security: validates Authorization: Bearer ${CRON_SECRET} header.
 *
 * Required environment variables:
 *   CRON_SECRET  — shared secret for cron invocation authentication
 *   SMTP_HOST    — SMTP relay hostname
 *   SMTP_PORT    — SMTP port (default 587)
 *   SMTP_USER    — SMTP authentication username
 *   SMTP_PASS    — SMTP authentication password
 *   SMTP_FROM    — Sender address (default no-reply@schedulebox.cz)
 */

import { NextResponse } from 'next/server';
import { eq, isNull, lte, and } from 'drizzle-orm';
import { db, platformBroadcasts, companies } from '@schedulebox/database';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Max broadcasts processed per cron run (prevents timeout)
const MAX_BROADCASTS_PER_RUN = 5;
// Max emails sent per cron run across all broadcasts
const MAX_EMAILS_PER_RUN = 100;

const DEFAULT_FROM = 'no-reply@schedulebox.cz';

// Module-level transporter — reused across function invocations (warm starts)
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * GET /api/v1/cron/broadcast-dispatch
 * Dispatch pending broadcasts to matching companies.
 */
export async function GET(req: Request): Promise<NextResponse> {
  // Security: validate CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Find pending broadcasts whose scheduled time has arrived
  const pendingBroadcasts = await db
    .select()
    .from(platformBroadcasts)
    .where(and(isNull(platformBroadcasts.sentAt), lte(platformBroadcasts.scheduledAt, now)))
    .orderBy(platformBroadcasts.scheduledAt)
    .limit(MAX_BROADCASTS_PER_RUN);

  let totalProcessed = 0;
  let totalEmailsSent = 0;

  for (const broadcast of pendingBroadcasts) {
    if (totalEmailsSent >= MAX_EMAILS_PER_RUN) {
      console.log(
        `[CronBroadcastDispatch] Email cap reached (${MAX_EMAILS_PER_RUN}). Stopping early.`,
      );
      break;
    }

    // Query matching companies
    const targetCompanies = await getTargetCompanies(broadcast.audience as string);
    const from = process.env.SMTP_FROM || DEFAULT_FROM;
    const subject = `ScheduleBox: ${broadcast.message.slice(0, 50)}${broadcast.message.length > 50 ? '...' : ''}`;

    let sent = 0;

    for (const company of targetCompanies) {
      if (totalEmailsSent >= MAX_EMAILS_PER_RUN) break;
      if (!company.email) continue;

      try {
        await transporter.sendMail({
          from,
          to: company.email,
          subject,
          html: buildBroadcastEmailHtml(broadcast.message),
          text: broadcast.message,
        });

        totalEmailsSent++;
        sent++;
      } catch (err) {
        console.error(
          `[CronBroadcastDispatch] Failed to send email to ${company.email} for broadcast ${broadcast.id}:`,
          err,
        );
        // Continue sending to other companies — one failure must not block others
      }
    }

    // Mark broadcast as sent (even if some individual emails failed)
    await db
      .update(platformBroadcasts)
      .set({ sentAt: new Date() })
      .where(eq(platformBroadcasts.id, broadcast.id));

    totalProcessed++;
    console.log(
      `[CronBroadcastDispatch] Broadcast ${broadcast.id} processed. Emails sent: ${sent}/${targetCompanies.length}`,
    );
  }

  return NextResponse.json({ processed: totalProcessed, emailsSent: totalEmailsSent });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AudiencePlan = 'free' | 'essential' | 'growth' | 'ai_powered';

async function getTargetCompanies(audience: string) {
  const baseCondition = and(eq(companies.isActive, true), isNull(companies.suspendedAt));

  const whereClause =
    audience === 'all'
      ? baseCondition
      : and(baseCondition, eq(companies.subscriptionPlan, audience as AudiencePlan));

  return db
    .select({ id: companies.id, email: companies.email, name: companies.name })
    .from(companies)
    .where(whereClause);
}

function buildBroadcastEmailHtml(message: string): string {
  // Escape HTML special characters in the message
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ScheduleBox — Zpráva pro zákazníky</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #2563eb; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .body { padding: 40px; color: #374151; line-height: 1.6; font-size: 15px; }
    .footer { padding: 24px 40px; background: #f9fafb; color: #9ca3af; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ScheduleBox</h1>
    </div>
    <div class="body">
      <p>${escapedMessage}</p>
    </div>
    <div class="footer">
      ScheduleBox s.r.o. &mdash; rezervační systém pro firmy
    </div>
  </div>
</body>
</html>`.trim();
}
