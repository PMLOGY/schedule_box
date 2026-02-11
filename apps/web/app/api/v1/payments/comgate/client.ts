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
  refId: string; // Booking UUID (for tracking)
  email: string; // Customer email
  redirectUrl: string; // Where user returns after payment
  callbackUrl: string; // Webhook URL for payment status updates
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
// VERIFY COMGATE SIGNATURE
// ============================================================================

/**
 * Verify Comgate webhook signature using HMAC-SHA256
 *
 * Uses crypto.timingSafeEqual for constant-time comparison to prevent timing attacks.
 *
 * @param rawBody Raw webhook body (before parsing)
 * @param signature Signature from webhook header
 * @returns True if signature is valid
 */
export function verifyComgateSignature(rawBody: string, signature: string): boolean {
  try {
    // Compute expected signature using HMAC-SHA256
    const { secret } = getComgateCredentials();
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    // Ensure both signatures are the same length before comparison
    if (expectedSignature.length !== signature.length) {
      return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    // Return false on any error (e.g., Buffer length mismatch)
    return false;
  }
}
