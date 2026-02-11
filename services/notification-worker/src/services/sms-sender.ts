/**
 * SMS Sender Service
 * Twilio SMS delivery with segment estimation
 */

import twilio from 'twilio';
import { config } from '../config.js';

let twilioClient: ReturnType<typeof twilio> | null = null;

/**
 * Get or create Twilio client
 */
function getTwilioClient() {
  if (!config.twilio.accountSid || !config.twilio.authToken) {
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  return twilioClient;
}

/**
 * Estimate SMS segment count
 * GSM-7 encoding: 160 chars per segment
 * UCS-2 encoding (with diacritics): 70 chars per segment
 *
 * @param body SMS text content
 */
export function estimateSMSSegments(body: string): number {
  // Check if contains Czech diacritics or special characters (requires UCS-2)
  // eslint-disable-next-line no-control-regex
  const hasUnicode = /[^\x00-\x7F]/.test(body);

  const maxLength = hasUnicode ? 70 : 160;
  const segments = Math.ceil(body.length / maxLength);

  return segments;
}

/**
 * Send SMS via Twilio
 * @param options SMS options
 * @returns Message SID if sent, or mock SID in development
 */
export async function sendSMS(options: { to: string; body: string }): Promise<string> {
  const client = getTwilioClient();

  // Development mode: Twilio not configured
  if (!client || !config.twilio.fromNumber) {
    const mockSid = `SM${Date.now()}mock`;
    console.warn('[SMS Sender] Twilio not configured, using mock SID:', mockSid);
    return mockSid;
  }

  try {
    const segments = estimateSMSSegments(options.body);
    console.log(
      `[SMS Sender] Sending SMS to ${options.to} (${segments} segment${segments > 1 ? 's' : ''})`,
    );

    const message = await client.messages.create({
      from: config.twilio.fromNumber,
      to: options.to,
      body: options.body,
    });

    console.log(`[SMS Sender] Sent SMS, SID: ${message.sid}`);
    return message.sid;
  } catch (error) {
    console.error('[SMS Sender] Failed to send SMS:', error);
    throw error;
  }
}
