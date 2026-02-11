/**
 * Comgate Payment Callback Endpoint
 * GET /api/v1/payments/comgate/callback - User redirect from Comgate after payment
 *
 * This endpoint handles the user returning to our site after attempting payment on Comgate.
 * It is NOT where payment status is confirmed - that's done via the webhook endpoint.
 * This simply redirects the user to the appropriate frontend page.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, payments } from '@schedulebox/database';

/**
 * GET /api/v1/payments/comgate/callback
 * Handle user redirect after Comgate payment attempt
 *
 * Query params:
 * - id: Comgate transaction ID
 * - refId: Booking UUID
 *
 * Redirects to frontend payment result page
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const transId = searchParams.get('id');
  const refId = searchParams.get('refId');

  // Determine locale from request (default to 'cs')
  const locale = 'cs'; // TODO: Extract from request headers or cookie

  // If no refId, redirect to error page
  if (!refId) {
    return NextResponse.redirect(new URL(`/${locale}/bookings/payment-error`, req.url));
  }

  // Look up payment by gateway transaction ID (if available)
  let paymentStatus = 'pending'; // Default status

  if (transId) {
    const [payment] = await db
      .select({ status: payments.status })
      .from(payments)
      .where(eq(payments.gatewayTransactionId, transId))
      .limit(1);

    if (payment && payment.status) {
      paymentStatus = payment.status;
    }
  }

  // Redirect to frontend payment result page
  const redirectUrl = new URL(`/${locale}/bookings/${refId}/payment-result`, req.url);
  redirectUrl.searchParams.set('status', paymentStatus);

  return NextResponse.redirect(redirectUrl);
}
