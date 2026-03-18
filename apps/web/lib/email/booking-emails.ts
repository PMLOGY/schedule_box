/**
 * Booking email sending functions
 *
 * Sends transactional booking emails (confirmation, status change, reminder) via
 * SMTP using nodemailer. Uses the same SMTP configuration as auth-emails.
 *
 * All exported functions are fire-and-forget safe — callers wrap in `.catch()`.
 *
 * Required environment variables (shared with auth-emails.ts):
 *   SMTP_HOST  — SMTP relay hostname
 *   SMTP_PORT  — SMTP port (default: 587, STARTTLS)
 *   SMTP_USER  — SMTP authentication username
 *   SMTP_PASS  — SMTP authentication password
 *   SMTP_FROM  — Sender address (default: no-reply@schedulebox.cz)
 */

import nodemailer from 'nodemailer';

// Module-level transporter — created once on import for connection reuse
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

const DEFAULT_FROM = 'no-reply@schedulebox.cz';

// ============================================================================
// TYPES
// ============================================================================

export interface BookingEmailData {
  to: string;
  customerName: string;
  serviceName: string;
  employeeName: string | null;
  startTime: Date;
  companyName: string;
  companyPhone: string | null;
  bookingUuid: string;
  locale?: 'cs' | 'sk' | 'en';
  /** Optional video meeting link — included in emails when set */
  meetingUrl?: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

const BRAND_COLOR = '#0057FF';

/**
 * Format a date for email display based on locale.
 */
function formatDateTime(date: Date, locale: 'cs' | 'sk' | 'en' = 'cs'): string {
  const localeMap: Record<string, string> = {
    cs: 'cs-CZ',
    sk: 'sk-SK',
    en: 'en-US',
  };
  return date.toLocaleString(localeMap[locale] ?? 'cs-CZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Build the shared branded HTML email wrapper.
 */
function buildEmailHtml(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: ${BRAND_COLOR}; padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.3px; }
    .body { padding: 40px; color: #374151; line-height: 1.6; }
    .body h2 { margin-top: 0; color: #111827; }
    .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .details-table td:first-child { font-weight: 600; color: #6b7280; width: 40%; white-space: nowrap; }
    .footer { padding: 24px 40px; background: #f9fafb; color: #9ca3af; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ScheduleBox</h1>
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      ScheduleBox s.r.o. &mdash; rezervační systém pro firmy
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Build the booking details table rows shared across email types.
 */
function buildDetailsTable(data: BookingEmailData): string {
  const dateStr = formatDateTime(data.startTime, data.locale ?? 'cs');
  const employeeRow = data.employeeName
    ? `<tr><td>Poskytovatel:</td><td>${data.employeeName}</td></tr>`
    : '';
  const phoneRow = data.companyPhone
    ? `<tr><td>Telefon:</td><td>${data.companyPhone}</td></tr>`
    : '';
  const meetingRow = data.meetingUrl
    ? `<tr><td>Video schůzka:</td><td><a href="${data.meetingUrl}" style="color: #0057FF; word-break: break-all;">${data.meetingUrl}</a></td></tr>`
    : '';

  return `
    <table class="details-table">
      <tr><td>Datum a čas:</td><td>${dateStr}</td></tr>
      <tr><td>Služba:</td><td>${data.serviceName}</td></tr>
      ${employeeRow}
      ${meetingRow}
      <tr><td>Provozovna:</td><td>${data.companyName}</td></tr>
      ${phoneRow}
      <tr><td>Číslo rezervace:</td><td>${data.bookingUuid}</td></tr>
    </table>
  `.trim();
}

/**
 * Build plain text version of booking details.
 */
function buildDetailsText(data: BookingEmailData): string {
  const dateStr = formatDateTime(data.startTime, data.locale ?? 'cs');
  const lines = [`Datum a čas: ${dateStr}`, `Služba: ${data.serviceName}`];
  if (data.employeeName) lines.push(`Poskytovatel: ${data.employeeName}`);
  if (data.meetingUrl) lines.push(`Video schůzka: ${data.meetingUrl}`);
  lines.push(`Provozovna: ${data.companyName}`);
  if (data.companyPhone) lines.push(`Telefon: ${data.companyPhone}`);
  lines.push(`Číslo rezervace: ${data.bookingUuid}`);
  return lines.join('\n');
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

/**
 * Send booking confirmation email.
 *
 * Fire-and-forget safe — callers should wrap in `.catch()`.
 *
 * @param data - Booking email data
 */
export async function sendBookingConfirmationEmail(data: BookingEmailData): Promise<void> {
  const from = process.env.SMTP_FROM || DEFAULT_FROM;
  const subject = 'Potvrzení rezervace — ScheduleBox';

  const detailsTable = buildDetailsTable(data);
  const html = buildEmailHtml(
    'Potvrzení rezervace',
    `
    <h2>Vaše rezervace byla přijata</h2>
    <p>Vážený/á ${data.customerName},</p>
    <p>děkujeme za Vaši rezervaci. Níže naleznete podrobnosti:</p>
    ${detailsTable}
    <p>Těšíme se na Vaši návštěvu!</p>
    `,
  );

  const text = [
    'Potvrzení rezervace — ScheduleBox',
    '',
    `Vážený/á ${data.customerName},`,
    '',
    'děkujeme za Vaši rezervaci. Níže naleznete podrobnosti:',
    '',
    buildDetailsText(data),
    '',
    'Těšíme se na Vaši návštěvu!',
  ].join('\n');

  await transporter.sendMail({ from, to: data.to, replyTo: from, subject, html, text });
}

/**
 * Send booking status change email.
 *
 * Fire-and-forget safe — callers should wrap in `.catch()`.
 *
 * @param data - Booking email data with new status
 */
export async function sendBookingStatusChangeEmail(
  data: BookingEmailData & { newStatus: 'confirmed' | 'cancelled' | 'completed' },
): Promise<void> {
  const from = process.env.SMTP_FROM || DEFAULT_FROM;

  const subjectMap: Record<string, string> = {
    confirmed: 'Rezervace potvrzena — ScheduleBox',
    cancelled: 'Rezervace zrušena — ScheduleBox',
    completed: 'Rezervace dokončena — ScheduleBox',
  };

  const headingMap: Record<string, string> = {
    confirmed: 'Vaše rezervace byla potvrzena',
    cancelled: 'Vaše rezervace byla zrušena',
    completed: 'Vaše rezervace byla dokončena',
  };

  const messageMap: Record<string, string> = {
    confirmed: 'Rádi Vás uvítáme! Níže naleznete podrobnosti Vaší rezervace:',
    cancelled: 'Vaše rezervace byla zrušena. Níže naleznete podrobnosti:',
    completed: 'Děkujeme za Vaši návštěvu. Níže naleznete podrobnosti:',
  };

  const subject = subjectMap[data.newStatus];
  const heading = headingMap[data.newStatus];
  const message = messageMap[data.newStatus];
  const detailsTable = buildDetailsTable(data);

  const html = buildEmailHtml(
    heading,
    `
    <h2>${heading}</h2>
    <p>Vážený/á ${data.customerName},</p>
    <p>${message}</p>
    ${detailsTable}
    `,
  );

  const text = [
    `${heading} — ScheduleBox`,
    '',
    `Vážený/á ${data.customerName},`,
    '',
    message,
    '',
    buildDetailsText(data),
  ].join('\n');

  await transporter.sendMail({ from, to: data.to, replyTo: from, subject, html, text });
}

/**
 * Send booking reminder email (24 hours before appointment).
 *
 * Fire-and-forget safe — callers should wrap in `.catch()`.
 *
 * @param data - Booking email data
 */
export async function sendBookingReminderEmail(data: BookingEmailData): Promise<void> {
  const from = process.env.SMTP_FROM || DEFAULT_FROM;
  const subject = 'Připomínka rezervace — ScheduleBox';
  const detailsTable = buildDetailsTable(data);

  const html = buildEmailHtml(
    'Připomínka rezervace',
    `
    <h2>Připomínka nadcházející rezervace</h2>
    <p>Vážený/á ${data.customerName},</p>
    <p>připomínáme Vám Vaši rezervaci zítřejší den:</p>
    ${detailsTable}
    <p>Těšíme se na Vaši návštěvu!</p>
    `,
  );

  const text = [
    'Připomínka rezervace — ScheduleBox',
    '',
    `Vážený/á ${data.customerName},`,
    '',
    'připomínáme Vám Vaši rezervaci zítřejší den:',
    '',
    buildDetailsText(data),
    '',
    'Těšíme se na Vaši návštěvu!',
  ].join('\n');

  await transporter.sendMail({ from, to: data.to, replyTo: from, subject, html, text });
}
