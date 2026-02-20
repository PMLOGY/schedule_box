/**
 * Twilio Usage Trigger Webhook
 * Receives callbacks when SMS spending approaches configured threshold.
 * Twilio sends form-encoded POST data with usage information.
 *
 * Note: Phase 22 (Monitoring) will add proper alerting (Slack/email).
 * For now, this logs the alert for observability.
 */
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.formData();

    const currentValue = data.get('CurrentValue');
    const triggerValue = data.get('TriggerValue');
    const usageCategory = data.get('UsageCategory');
    const triggerSid = data.get('UsageTriggerSid');
    const dateCreated = data.get('DateFired');

    console.warn(
      `[Twilio Usage Alert] ${usageCategory} spend reached $${currentValue} ` +
        `(threshold: $${triggerValue}) | Trigger: ${triggerSid} | Fired: ${dateCreated}`,
    );

    // TODO: Phase 22 will add proper alerting (Slack webhook, admin email notification)
    // For now, structured logging is sufficient for Railway log monitoring

    return NextResponse.json({ received: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[Twilio Usage Webhook] Error processing callback:', error);
    return NextResponse.json({ error: 'Failed to process usage callback' }, { status: 500 });
  }
}
