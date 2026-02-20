#!/usr/bin/env npx tsx
/**
 * Setup Twilio Usage Trigger for SMS Cost Monitoring
 *
 * Run once after Twilio credentials are configured:
 *   npx tsx scripts/setup-twilio-usage-trigger.ts
 *
 * Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 * Optional: SMS_BUDGET_ALERT_THRESHOLD (default: 50 USD), NEXT_PUBLIC_APP_URL
 */

import twilio from 'twilio';

async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.schedulebox.cz';
  const threshold = process.env.SMS_BUDGET_ALERT_THRESHOLD || '50';

  if (!accountSid || !authToken) {
    console.error('ERROR: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set.');
    console.error('Set them in .env.local or export them before running this script.');
    process.exit(1);
  }

  const client = twilio(accountSid, authToken);
  const callbackUrl = `${appUrl}/api/v1/webhooks/twilio-usage`;

  console.log(`Creating Twilio Usage Trigger...`);
  console.log(`  Threshold: $${threshold} USD monthly SMS spend`);
  console.log(`  Callback: ${callbackUrl}`);

  try {
    const trigger = await client.usage.triggers.create({
      friendlyName: 'ScheduleBox SMS Monthly Budget Alert',
      usageCategory: 'sms',
      triggerBy: 'price',
      triggerValue: threshold,
      recurring: 'monthly',
      callbackUrl,
      callbackMethod: 'POST',
    });

    console.log(`\nUsage trigger created successfully!`);
    console.log(`  SID: ${trigger.sid}`);
    console.log(`  Recurring: monthly`);
    console.log(`  Alert at: $${threshold} USD SMS spend`);
    console.log(`\nTwilio will POST to ${callbackUrl} when threshold is reached.`);
  } catch (error) {
    console.error('Failed to create usage trigger:', error);
    process.exit(1);
  }
}

main();
