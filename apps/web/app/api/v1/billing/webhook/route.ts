/**
 * POST /api/v1/billing/webhook
 * Comgate webhook handler for subscription payments.
 *
 * PUBLIC ENDPOINT - No auth (called by Comgate servers).
 * Follows the exact same pattern as apps/web/app/api/v1/webhooks/comgate/route.ts:
 * 1. Read raw body as text
 * 2. Parse as URLSearchParams
 * 3. Verify Comgate secret via verifyComgateWebhookSecret
 * 4. Extract transId and status
 * 5. Call processSubscriptionWebhook from billing service
 * 6. Return 200 immediately (Comgate expects <5s response)
 *
 * Idempotency via subscription_events table (separate from processed_webhooks).
 * Defense-in-depth: cross-check status via getComgatePaymentStatus API.
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  verifyComgateWebhookSecret,
  getComgatePaymentStatus,
} from '@/app/api/v1/payments/comgate/client';
import { processSubscriptionWebhook } from '@/app/api/v1/billing/service';

/**
 * POST /api/v1/billing/webhook
 * Process Comgate webhook notifications for subscription payments.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body
    const rawBody = await req.text();

    // 2. Parse body (application/x-www-form-urlencoded)
    const parsedBody = new URLSearchParams(rawBody);

    // 3. Verify POST body secret
    const receivedSecret = parsedBody.get('secret') || '';
    if (!verifyComgateWebhookSecret(receivedSecret)) {
      console.error('[Billing Webhook] Secret verification failed');
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    // 4. Extract required fields
    const transId = parsedBody.get('transId');
    let status = parsedBody.get('status');

    if (!transId || !status) {
      console.error('[Billing Webhook] Missing required fields', { transId, status });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 5. Convert parsed body to plain object for storage
    const payload: Record<string, unknown> = {};
    parsedBody.forEach((value, key) => {
      payload[key] = value;
    });

    // 6. Defense-in-depth: verify payment status via Comgate API
    try {
      const apiStatus = await getComgatePaymentStatus(transId);
      if (apiStatus.status && apiStatus.status !== status) {
        console.warn(
          `[Billing Webhook] Status mismatch for ${transId}: webhook="${status}", API="${apiStatus.status}". Trusting API response.`,
        );
        status = apiStatus.status;
      }
    } catch (error) {
      // API check is best-effort
      console.warn(
        '[Billing Webhook] Could not verify status via API (proceeding with webhook status):',
        error,
      );
    }

    // 7. Process subscription webhook (handles idempotency internally)
    const result = await processSubscriptionWebhook(transId, status, payload);

    if (result.alreadyProcessed) {
      console.log(`[Billing Webhook] Transaction ${transId} already processed, ignoring duplicate`);
      return NextResponse.json({ message: 'Already processed' }, { status: 200 });
    }

    // 8. Return 200 immediately (Comgate expects response within 5 seconds)
    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (error) {
    // Return 500 so Comgate will retry
    console.error(
      '[Billing Webhook] Processing error:',
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
