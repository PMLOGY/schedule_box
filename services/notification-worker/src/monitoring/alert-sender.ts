/**
 * Alert Sender
 * Dual-channel alert delivery: SMTP email (primary) + Slack webhook (fallback)
 *
 * Design contract: sendAlert() NEVER throws. All errors are logged and swallowed
 * so that alerting failures never crash the monitoring loop.
 */

import nodemailer from 'nodemailer';
import { config } from '../config.js';

/**
 * Alert payload for monitoring notifications
 */
export interface AlertPayload {
  subject: string;
  body: string;
  severity: 'warning' | 'critical';
}

/** Lazy SMTP transporter — created on first alert send */
let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create the SMTP transporter
 * Uses the same SMTP config as the rest of the notification worker
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port ?? 587,
      secure: (config.smtp.port ?? 587) === 465,
      auth:
        config.smtp.user && config.smtp.pass
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined,
    });
  }
  return transporter;
}

/**
 * Send an alert via email (primary) and Slack webhook (fallback if configured)
 *
 * Never throws — all delivery errors are caught and logged.
 * Always logs the alert to console regardless of channel delivery success.
 *
 * @param payload Alert subject, body, and severity level
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  const prefixedSubject = `[ScheduleBox ${payload.severity.toUpperCase()}] ${payload.subject}`;

  // Always log to console so the alert is visible in Railway logs
  console.warn('[Monitor Alert]', prefixedSubject, payload.body);

  // Primary channel: SMTP email
  try {
    const smtp = getTransporter();
    await smtp.sendMail({
      from: config.smtp.from,
      to: config.monitoring.alertEmail,
      subject: prefixedSubject,
      text: payload.body,
      html: `<pre>${payload.body}</pre>`,
    });
    console.log('[Monitor Alert] Email alert sent to', config.monitoring.alertEmail);
  } catch (error) {
    console.error(
      '[Monitor Alert] Failed to send email alert:',
      error instanceof Error ? error.message : error,
    );
    // Do NOT re-throw — fall through to Slack fallback
  }

  // Fallback channel: Slack webhook (only if configured)
  if (config.monitoring.slackWebhookUrl) {
    try {
      const response = await fetch(config.monitoring.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${prefixedSubject}\n${payload.body}`,
        }),
      });

      if (!response.ok) {
        console.error('[Monitor Alert] Slack webhook returned non-OK status:', response.status);
      } else {
        console.log('[Monitor Alert] Slack alert sent');
      }
    } catch (error) {
      console.error(
        '[Monitor Alert] Failed to send Slack alert:',
        error instanceof Error ? error.message : error,
      );
      // Do NOT re-throw
    }
  }
}
