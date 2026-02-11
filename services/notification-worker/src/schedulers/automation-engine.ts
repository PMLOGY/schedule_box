/**
 * Automation Rule Execution Engine
 * Processes automation rules when domain events fire
 */

import type { Queue } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db, automationRules, automationLogs, customers } from '@schedulebox/database';
import { renderTemplateFile } from '../services/template-renderer.js';

/**
 * Queues interface
 */
interface Queues {
  emailQueue: Queue;
  smsQueue: Queue;
  pushQueue: Queue;
}

/**
 * CloudEvent type to automation trigger type mapping
 * Only domain events (booking.*, payment.*, review.*) are mapped
 * notification.* and automation.* are explicitly excluded to prevent infinite loops
 */
const TRIGGER_TYPE_MAP: Record<string, string> = {
  'com.schedulebox.booking.created': 'booking_created',
  'com.schedulebox.booking.confirmed': 'booking_confirmed',
  'com.schedulebox.booking.completed': 'booking_completed',
  'com.schedulebox.booking.cancelled': 'booking_cancelled',
  'com.schedulebox.booking.no_show': 'booking_no_show',
  'com.schedulebox.payment.completed': 'payment_received',
  'com.schedulebox.review.created': 'review_received',
};

/**
 * Process automation rules for a domain event
 */
export async function processAutomationRules(
  eventType: string,
  eventData: Record<string, unknown>,
  companyId: number,
  eventId: string,
  queues: Queues,
): Promise<void> {
  // Map CloudEvent type to automation trigger type
  const triggerType = TRIGGER_TYPE_MAP[eventType];

  if (!triggerType) {
    // Event type doesn't map to a trigger - return early (prevent loop)
    return;
  }

  console.log(
    `[Automation Engine] Processing rules for trigger: ${triggerType} (event: ${eventType})`,
  );

  // Query active automation rules for this trigger type and company
  const rules = await db
    .select()
    .from(automationRules)
    .where(
      and(
        eq(automationRules.companyId, companyId),
        eq(automationRules.triggerType, triggerType),
        eq(automationRules.isActive, true),
      ),
    );

  console.log(`[Automation Engine] Found ${rules.length} active rules for ${triggerType}`);

  // Process each rule independently
  for (const rule of rules) {
    try {
      await processRule(rule, eventData, eventId, queues);
    } catch (error) {
      console.error(`[Automation Engine] Error processing rule ${rule.id}:`, error);
      // Continue processing other rules even if one fails
    }
  }
}

/**
 * Process a single automation rule
 */
async function processRule(
  rule: {
    id: number;
    companyId: number;
    actionType: string;
    actionConfig: unknown;
    delayMinutes: number | null;
  },
  eventData: Record<string, unknown>,
  eventId: string,
  queues: Queues,
): Promise<void> {
  // Create automation_log record with status='pending'
  const [log] = await db
    .insert(automationLogs)
    .values({
      ruleId: rule.id,
      customerId: (eventData.customerId as number) || null,
      bookingId: (eventData.bookingId as number) || null,
      status: 'pending',
      result: {},
    })
    .returning({ id: automationLogs.id });

  const logId = log.id;

  try {
    // Determine action based on rule.actionType
    const jobId = `auto-${rule.id}-${eventId}`;
    const delay =
      rule.delayMinutes && rule.delayMinutes > 0 ? rule.delayMinutes * 60 * 1000 : undefined;

    switch (rule.actionType) {
      case 'send_email':
        await handleSendEmail(rule, eventData, queues.emailQueue, jobId, delay);
        break;

      case 'send_sms':
        await handleSendSms(rule, eventData, queues.smsQueue, jobId, delay);
        break;

      case 'send_push':
        await handleSendPush(rule, eventData, queues.pushQueue, jobId, delay);
        break;

      default:
        // Other action types not implemented in Phase 7
        await db
          .update(automationLogs)
          .set({
            status: 'skipped',
            errorMessage: `Action type '${rule.actionType}' not implemented`,
          })
          .where(eq(automationLogs.id, logId));
        console.log(
          `[Automation Engine] Skipped rule ${rule.id} - action type '${rule.actionType}' not implemented`,
        );
        return;
    }

    // Update automation_log: status='executed', executedAt=now()
    await db
      .update(automationLogs)
      .set({
        status: 'executed',
        executedAt: new Date(),
      })
      .where(eq(automationLogs.id, logId));

    console.log(`[Automation Engine] Executed rule ${rule.id} successfully`);
  } catch (error) {
    // Update automation_log: status='failed', errorMessage=error.message
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(automationLogs)
      .set({
        status: 'failed',
        errorMessage,
      })
      .where(eq(automationLogs.id, logId));

    console.error(`[Automation Engine] Failed rule ${rule.id}:`, errorMessage);

    // Re-throw to be caught by outer try-catch
    throw error;
  }
}

/**
 * Handle send_email action
 */
async function handleSendEmail(
  rule: {
    id: number;
    companyId: number;
    actionConfig: unknown;
  },
  eventData: Record<string, unknown>,
  emailQueue: Queue,
  jobId: string,
  delay?: number,
): Promise<void> {
  // Fetch template from rule.actionConfig.templateId
  const actionConfig = rule.actionConfig as Record<string, unknown>;
  const templateId = actionConfig.templateId as number | undefined;

  if (!templateId) {
    throw new Error('send_email action requires templateId in actionConfig');
  }

  const template = await db.query.notificationTemplates.findFirst({
    where: (templates, { eq, and }) =>
      and(eq(templates.id, templateId), eq(templates.companyId, rule.companyId)),
  });

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Get customer email
  const customerId = eventData.customerId as number | undefined;
  if (!customerId) {
    throw new Error('send_email action requires customerId in event data');
  }

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer || !customer.email) {
    throw new Error(`Customer ${customerId} not found or has no email`);
  }

  // Render template with event data
  const emailHtml = await renderTemplateFile(template.bodyTemplate, 'email', eventData);
  const emailSubject = template.subject || 'Notifikace';

  // Enqueue email job
  await emailQueue.add(
    'send-email',
    {
      companyId: rule.companyId,
      recipient: customer.email,
      subject: emailSubject,
      html: emailHtml,
      customerId,
      bookingId: (eventData.bookingId as number) || null,
      templateId,
    },
    {
      jobId,
      delay,
    },
  );

  console.log(
    `[Automation Engine] Enqueued email for rule ${rule.id} (delay: ${delay || 0}ms, jobId: ${jobId})`,
  );
}

/**
 * Handle send_sms action
 */
async function handleSendSms(
  rule: {
    id: number;
    companyId: number;
    actionConfig: unknown;
  },
  eventData: Record<string, unknown>,
  smsQueue: Queue,
  jobId: string,
  delay?: number,
): Promise<void> {
  // Fetch template from rule.actionConfig.templateId
  const actionConfig = rule.actionConfig as Record<string, unknown>;
  const templateId = actionConfig.templateId as number | undefined;

  if (!templateId) {
    throw new Error('send_sms action requires templateId in actionConfig');
  }

  const template = await db.query.notificationTemplates.findFirst({
    where: (templates, { eq, and }) =>
      and(eq(templates.id, templateId), eq(templates.companyId, rule.companyId)),
  });

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Get customer phone
  const customerId = eventData.customerId as number | undefined;
  if (!customerId) {
    throw new Error('send_sms action requires customerId in event data');
  }

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });

  if (!customer || !customer.phone) {
    throw new Error(`Customer ${customerId} not found or has no phone`);
  }

  // Render template with event data
  const smsBody = await renderTemplateFile(template.bodyTemplate, 'sms', eventData);

  // Enqueue SMS job
  await smsQueue.add(
    'send-sms',
    {
      companyId: rule.companyId,
      recipient: customer.phone,
      body: smsBody,
      customerId,
      bookingId: (eventData.bookingId as number) || null,
      templateId,
    },
    {
      jobId,
      delay,
    },
  );

  console.log(
    `[Automation Engine] Enqueued SMS for rule ${rule.id} (delay: ${delay || 0}ms, jobId: ${jobId})`,
  );
}

/**
 * Handle send_push action
 */
async function handleSendPush(
  rule: {
    id: number;
    companyId: number;
    actionConfig: unknown;
  },
  eventData: Record<string, unknown>,
  pushQueue: Queue,
  jobId: string,
  delay?: number,
): Promise<void> {
  // Fetch template from rule.actionConfig.templateId
  const actionConfig = rule.actionConfig as Record<string, unknown>;
  const templateId = actionConfig.templateId as number | undefined;

  if (!templateId) {
    throw new Error('send_push action requires templateId in actionConfig');
  }

  const template = await db.query.notificationTemplates.findFirst({
    where: (templates, { eq, and }) =>
      and(eq(templates.id, templateId), eq(templates.companyId, rule.companyId)),
  });

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Get customer push subscription
  const customerId = eventData.customerId as number | undefined;
  if (!customerId) {
    throw new Error('send_push action requires customerId in event data');
  }

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
    with: {
      user: true,
    },
  });

  if (!customer || !customer.user) {
    throw new Error(`Customer ${customerId} not found or has no user`);
  }

  // Check for push subscription in user metadata
  const metadata = (customer.user.metadata || {}) as Record<string, unknown>;
  const pushSubscription = metadata.pushSubscription as
    | {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      }
    | undefined;

  if (!pushSubscription) {
    // No push subscription found - log as 'skipped'
    await db
      .update(automationLogs)
      .set({
        status: 'skipped',
        errorMessage: 'No push subscription found for customer',
      })
      .where(eq(automationLogs.ruleId, rule.id));

    console.log(
      `[Automation Engine] Skipped push notification for rule ${rule.id} - no subscription`,
    );
    return;
  }

  // Enqueue push job
  await pushQueue.add(
    'send-push',
    {
      companyId: rule.companyId,
      subscription: pushSubscription,
      title: template.subject || 'Notifikace',
      body: template.bodyTemplate, // Use bodyTemplate directly for push (plain text)
      customerId,
      bookingId: (eventData.bookingId as number) || null,
      templateId,
    },
    {
      jobId,
      delay,
    },
  );

  console.log(
    `[Automation Engine] Enqueued push for rule ${rule.id} (delay: ${delay || 0}ms, jobId: ${jobId})`,
  );
}
