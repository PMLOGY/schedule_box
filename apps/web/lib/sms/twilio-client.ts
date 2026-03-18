/**
 * Twilio SMS Client
 *
 * Thin wrapper around the Twilio SDK with Czech phone number normalization.
 * Phone numbers without a country code prefix are assumed to be Czech (+420).
 *
 * Required environment variables:
 *   TWILIO_ACCOUNT_SID  — Twilio account SID
 *   TWILIO_AUTH_TOKEN   — Twilio auth token
 *   TWILIO_FROM_NUMBER  — Twilio sending number (e.g. +420XXXXXXXXX or Messaging Service SID)
 */

import twilio from 'twilio';

// Lazy-initialized client — created on first use to avoid startup cost
let _client: ReturnType<typeof twilio> | null = null;

function getClient(): ReturnType<typeof twilio> | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('[twilio-client] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — SMS disabled');
    return null;
  }

  if (!_client) {
    _client = twilio(accountSid, authToken);
  }

  return _client;
}

/**
 * Normalize a phone number to E.164 format.
 * Czech numbers without a country code (+) prefix are treated as +420.
 *
 * @param phone - Raw phone number (e.g. "608123456" or "+420608123456")
 * @returns E.164 formatted phone number (e.g. "+420608123456")
 */
function normalizePhoneE164(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  // Czech default: prepend +420
  return `+420${trimmed}`;
}

/**
 * Send an SMS message via Twilio.
 *
 * Normalizes Czech phone numbers to E.164 format automatically.
 * Returns empty string if Twilio credentials are not configured (dev-safe).
 *
 * @param to   - Recipient phone number (E.164 or Czech local format)
 * @param body - Message body text
 * @returns Twilio message SID, or empty string if SMS is disabled
 */
export async function sendSMS(to: string, body: string): Promise<string> {
  const client = getClient();

  if (!client) {
    return '';
  }

  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!fromNumber) {
    console.warn('[twilio-client] TWILIO_FROM_NUMBER not set — skipping SMS');
    return '';
  }

  const normalizedTo = normalizePhoneE164(to);

  const message = await client.messages.create({
    body,
    from: fromNumber,
    to: normalizedTo,
  });

  return message.sid;
}
