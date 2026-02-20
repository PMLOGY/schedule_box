/**
 * SMS Sender Service
 * Twilio SMS delivery with segment estimation
 */

import twilio from 'twilio';
import { config } from '../config.js';
import { smsSegmentsTotal } from '../monitoring/metrics.js';

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
 * GSM-7 encoding: 160 chars single, 153 chars per segment if multipart (UDH overhead)
 * UCS-2 encoding (with diacritics): 70 chars single, 67 chars per segment if multipart
 *
 * @param body SMS text content
 */
export function estimateSMSSegments(body: string): number {
  // Check if contains Czech diacritics or special characters (requires UCS-2)
  // eslint-disable-next-line no-control-regex
  const hasUnicode = /[^\x00-\x7F]/.test(body);

  if (hasUnicode) {
    // UCS-2: 70 chars single, 67 chars per segment if multipart
    return body.length <= 70 ? 1 : Math.ceil(body.length / 67);
  } else {
    // GSM-7: 160 chars single, 153 chars per segment if multipart
    return body.length <= 160 ? 1 : Math.ceil(body.length / 153);
  }
}

/**
 * Czech mobile number regex (E.164 format)
 * Mobile prefixes: +420 6xx or +420 7xx
 * Landlines: +420 2xx-5xx (will be rejected)
 */
const CZECH_MOBILE_REGEX = /^\+420[67][0-9]{8}$/;

/**
 * Validate that a phone number is a Czech mobile number
 * Rejects landlines which would cause Twilio error 21614
 */
export function isValidCzechMobile(phone: string): boolean {
  return CZECH_MOBILE_REGEX.test(phone);
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

    // Track segment count for cost estimation (real Twilio sends only)
    smsSegmentsTotal.inc(segments);

    console.log(`[SMS Sender] Sent SMS, SID: ${message.sid}`);
    return message.sid;
  } catch (error) {
    console.error('[SMS Sender] Failed to send SMS:', error);
    throw error;
  }
}
