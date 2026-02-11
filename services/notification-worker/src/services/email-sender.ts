/**
 * Email Sender Service
 * Nodemailer SMTP transport with connection pooling
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '../config.js';

let transporter: Transporter | null = null;

/**
 * Get or create Nodemailer transporter with connection pooling
 */
function getTransporter(): Transporter | null {
  if (!config.smtp.host || !config.smtp.port) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465, // true for 465, false for other ports
      auth:
        config.smtp.user && config.smtp.pass
          ? {
              user: config.smtp.user,
              pass: config.smtp.pass,
            }
          : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  return transporter;
}

/**
 * Inject tracking pixel into HTML email
 * @param html Email HTML content
 * @param notificationId Notification ID for tracking
 */
export function injectTrackingPixel(html: string, notificationId: number): string {
  const pixelUrl = `${config.appUrl}/api/v1/webhooks/email-tracking/open?nid=${notificationId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;">`;

  // Try to inject before </body> tag, or append at end
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

/**
 * Send email via SMTP
 * @param options Email options
 * @returns Message ID if sent, or mock ID in development
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<string> {
  const transport = getTransporter();

  // Development mode: SMTP not configured
  if (!transport) {
    const mockId = `mock-${Date.now()}@schedulebox.cz`;
    console.warn('[Email Sender] SMTP not configured, using mock message ID:', mockId);
    return mockId;
  }

  try {
    const info = await transport.sendMail({
      from: options.from || config.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`[Email Sender] Sent email to ${options.to}, messageId: ${info.messageId}`);
    return info.messageId;
  } catch (error) {
    console.error('[Email Sender] Failed to send email:', error);
    throw error;
  }
}
