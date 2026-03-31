/**
 * Automation Push Handler
 *
 * Executes 'send_push' automation actions by delivering push notifications
 * to target users and logging the result in the notifications table.
 */

import { eq, and } from 'drizzle-orm';
import { db, notifications, users, customers } from '@schedulebox/database';
import { sendPushToUser } from '@/lib/push/web-push-service';

// ============================================================================
// TYPES
// ============================================================================

export interface AutomationPushParams {
  ruleId: number;
  companyId: number;
  customerId?: number;
  bookingId?: number;
  actionConfig: {
    title?: string;
    body?: string;
    url?: string;
  };
}

export interface AutomationPushResult {
  success: boolean;
  sent: number;
  notificationId: number | null;
}

// ============================================================================
// EXECUTE AUTOMATION PUSH
// ============================================================================

/**
 * Execute a send_push automation action.
 *
 * Resolves the target user from customerId, sends push notification,
 * and creates a notification record for audit.
 *
 * @returns Result with success status, send count, and notification record ID
 */
export async function executeAutomationPush(
  params: AutomationPushParams,
): Promise<AutomationPushResult> {
  const { companyId, customerId, bookingId, actionConfig } = params;

  // Determine target userId from customerId
  let targetUserId: number | null = null;
  let recipientLabel = 'unknown';

  if (customerId) {
    // Look up customer to get their email
    const [customer] = await db
      .select({ email: customers.email, name: customers.name })
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
      .limit(1);

    if (customer?.email) {
      recipientLabel = customer.email;

      // Find user account matching customer email + company
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, customer.email), eq(users.companyId, companyId)))
        .limit(1);

      targetUserId = user?.id ?? null;
    }

    if (!targetUserId && customer?.name) {
      recipientLabel = customer.name;
    }
  }

  if (!targetUserId) {
    console.warn(
      `[AutomationPush] No user account found for customerId=${customerId} in company=${companyId}. Push skipped.`,
    );
    return { success: false, sent: 0, notificationId: null };
  }

  // Build push payload with defaults
  const payload = {
    title: actionConfig.title || 'ScheduleBox',
    body: actionConfig.body || 'Mate novou notifikaci',
    url: actionConfig.url || '/dashboard',
  };

  // Send push notification
  const result = await sendPushToUser(targetUserId, payload);

  // Insert notification record
  const [notifRecord] = await db
    .insert(notifications)
    .values({
      companyId,
      customerId: customerId ?? null,
      bookingId: bookingId ?? null,
      channel: 'push',
      recipient: recipientLabel,
      subject: payload.title,
      body: payload.body,
      status: result.sent > 0 ? 'sent' : 'failed',
      sentAt: result.sent > 0 ? new Date() : undefined,
      errorMessage:
        result.sent === 0 && result.failed > 0
          ? `Push delivery failed for ${result.failed} subscription(s)`
          : undefined,
    })
    .returning({ id: notifications.id });

  return {
    success: result.sent > 0,
    sent: result.sent,
    notificationId: notifRecord?.id ?? null,
  };
}
