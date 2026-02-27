/**
 * Comgate Payment Gateway HTTP Client
 * Handles all HTTP communication with Comgate API
 */

import crypto from 'crypto';
import { AppError } from '@schedulebox/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface InitComgatePaymentParams {
  price: number; // Amount in CZK (will be converted to hellers internally)
  currency: string;
  label: string; // Payment description
  refId: string; // Booking UUID or subscription UUID (for tracking)
  email: string; // Customer email
  redirectUrl: string; // Where user returns after payment
  callbackUrl: string; // Webhook URL for payment status updates
  initRecurring?: boolean; // Set true to create a recurring payment token
}

export interface ComgatePaymentResponse {
  transactionId: string;
  redirectUrl: string;
}

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const COMGATE_API_URL = process.env.COMGATE_API_URL || 'https://payments.comgate.cz';

/** Lazily validate Comgate credentials when a Comgate function is actually called */
function getComgateCredentials() {
  const merchantId = process.env.COMGATE_MERCHANT_ID;
  const secret = process.env.COMGATE_SECRET;
  if (!merchantId || !secret) {
    throw new AppError(
      'PAYMENT_GATEWAY_ERROR',
      'Comgate credentials not configured (COMGATE_MERCHANT_ID, COMGATE_SECRET)',
      500,
    );
  }
  return { merchantId, secret };
}

// ============================================================================
// UTILITY: FETCH WITH TIMEOUT
// ============================================================================

/**
 * Fetch with automatic timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// INIT COMGATE PAYMENT
// ============================================================================

/**
 * Create payment on Comgate and get redirect URL
 *
 * @param params Payment initialization parameters
 * @returns Transaction ID and redirect URL
 * @throws AppError with PAYMENT_GATEWAY_ERROR if Comgate returns error
 */
export async function initComgatePayment(
  params: InitComgatePaymentParams,
): Promise<ComgatePaymentResponse> {
  const { price, currency, label, refId, email, redirectUrl, callbackUrl } = params;

  // Convert price from CZK to hellers (1 CZK = 100 hellers)
  const priceInHellers = Math.round(price * 100);

  // Build request body (application/x-www-form-urlencoded)
  const { merchantId } = getComgateCredentials();
  const requestParams = new URLSearchParams();
  requestParams.set('merchant', merchantId);
  requestParams.set('test', process.env.NODE_ENV !== 'production' ? 'true' : 'false');
  requestParams.set('price', priceInHellers.toString());
  requestParams.set('curr', currency.toUpperCase());
  requestParams.set('label', label);
  requestParams.set('refId', refId);
  requestParams.set('email', email);
  requestParams.set('method', 'ALL'); // Allow all payment methods
  requestParams.set('prepareOnly', 'true'); // Get redirect URL without auto-redirect
  requestParams.set('lang', 'cs'); // Czech language
  requestParams.set('url', redirectUrl);
  requestParams.set('callback', callbackUrl);

  // Enable recurring payment token creation for subscription billing
  if (params.initRecurring) {
    requestParams.set('initRecurring', 'true');
  }

  // Call Comgate API
  const response = await fetchWithTimeout(`${COMGATE_API_URL}/v1.0/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestParams.toString(),
  });

  // Parse response (Comgate returns URL-encoded string)
  const responseText = await response.text();
  const responseParams = new URLSearchParams(responseText);

  // Check for errors
  const code = responseParams.get('code');
  const message = responseParams.get('message');

  if (code !== '0') {
    throw new AppError(
      `Comgate payment creation failed: ${message || 'Unknown error'}`,
      'PAYMENT_GATEWAY_ERROR',
      500,
    );
  }

  // Extract transaction ID and redirect URL
  const transactionId = responseParams.get('transId');
  const redirect = responseParams.get('redirect');

  if (!transactionId || !redirect) {
    throw new AppError(
      'Comgate response missing transId or redirect URL',
      'PAYMENT_GATEWAY_ERROR',
      500,
    );
  }

  return {
    transactionId,
    redirectUrl: redirect,
  };
}

// ============================================================================
// GET COMGATE PAYMENT STATUS
// ============================================================================

/**
 * Check payment status on Comgate
 *
 * @param transId Comgate transaction ID
 * @returns Parsed status response
 */
export async function getComgatePaymentStatus(transId: string): Promise<Record<string, string>> {
  const { merchantId, secret } = getComgateCredentials();
  const requestParams = new URLSearchParams();
  requestParams.set('merchant', merchantId);
  requestParams.set('transId', transId);
  requestParams.set('secret', secret);

  const response = await fetchWithTimeout(`${COMGATE_API_URL}/v1.0/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestParams.toString(),
  });

  const responseText = await response.text();
  const responseParams = new URLSearchParams(responseText);

  // Convert URLSearchParams to plain object
  const status: Record<string, string> = {};
  responseParams.forEach((value, key) => {
    status[key] = value;
  });

  return status;
}

// ============================================================================
// REFUND COMGATE PAYMENT
// ============================================================================

/**
 * Initiate refund on Comgate
 *
 * @param transId Comgate transaction ID
 * @param amount Optional amount in hellers for partial refund (omit for full refund)
 * @returns Success/failure status
 */
export async function refundComgatePayment(
  transId: string,
  amount?: number,
): Promise<{ success: boolean; message?: string }> {
  const { merchantId, secret } = getComgateCredentials();
  const requestParams = new URLSearchParams();
  requestParams.set('merchant', merchantId);
  requestParams.set('transId', transId);
  requestParams.set('secret', secret);

  // Add amount for partial refund
  if (amount !== undefined) {
    requestParams.set('amount', amount.toString());
  }

  const response = await fetchWithTimeout(`${COMGATE_API_URL}/v1.0/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestParams.toString(),
  });

  const responseText = await response.text();
  const responseParams = new URLSearchParams(responseText);

  const code = responseParams.get('code');
  const message = responseParams.get('message');

  return {
    success: code === '0',
    message: message || undefined,
  };
}

// ============================================================================
// CHARGE RECURRING PAYMENT
// ============================================================================

/**
 * Charge a recurring payment using a previously authorized card token.
 *
 * Comgate recurring works in two phases:
 * 1. Initial payment with initRecurring=true (user-facing redirect)
 * 2. Subsequent charges via POST /v1.0/recurring (server-to-server)
 *
 * The initRecurringId is the transId from the initial payment.
 *
 * @param params Recurring charge parameters
 * @returns Transaction ID, code, and message from Comgate
 */
export async function chargeRecurringPayment(params: {
  initRecurringId: string; // transId from the initial payment
  price: number; // Amount in CZK (converted to hellers internally)
  currency: string;
  label: string;
  refId: string;
  email: string;
}): Promise<{ transactionId: string; code: string; message: string }> {
  const { merchantId, secret } = getComgateCredentials();
  const requestParams = new URLSearchParams();
  requestParams.set('merchant', merchantId);
  requestParams.set('secret', secret);
  requestParams.set('test', process.env.NODE_ENV !== 'production' ? 'true' : 'false');
  requestParams.set('price', Math.round(params.price * 100).toString());
  requestParams.set('curr', params.currency.toUpperCase());
  requestParams.set('label', params.label);
  requestParams.set('refId', params.refId);
  requestParams.set('email', params.email);
  requestParams.set('initRecurringId', params.initRecurringId);

  const response = await fetchWithTimeout(`${COMGATE_API_URL}/v1.0/recurring`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestParams.toString(),
  });

  const responseText = await response.text();
  const responseParams = new URLSearchParams(responseText);

  return {
    transactionId: responseParams.get('transId') || '',
    code: responseParams.get('code') || '',
    message: responseParams.get('message') || '',
  };
}

// ============================================================================
// VERIFY COMGATE WEBHOOK SECRET
// ============================================================================

/**
 * Verify Comgate webhook secret from POST body parameter
 *
 * Comgate sends the merchant secret as a POST body parameter named "secret",
 * NOT as an HMAC header. This function compares the received secret with the
 * configured COMGATE_SECRET using timing-safe comparison to prevent timing attacks.
 *
 * Per Comgate's API behavior (confirmed via PHP SDK, Node SDK, Clojure client):
 * the gateway echoes back the merchant secret in the webhook POST body, and
 * merchant code is expected to verify it matches the configured secret.
 *
 * @param receivedSecret The "secret" field value from the POST body
 * @returns True if the secret matches the configured COMGATE_SECRET
 */
export function verifyComgateWebhookSecret(receivedSecret: string): boolean {
  try {
    const { secret } = getComgateCredentials();

    // Length mismatch: reject immediately (timingSafeEqual requires same-length buffers)
    if (receivedSecret.length !== secret.length) {
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    const receivedBuffer = Buffer.from(receivedSecret, 'utf8');
    const expectedBuffer = Buffer.from(secret, 'utf8');

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    // Return false on any error (e.g., credentials not configured)
    return false;
  }
}
