/**
 * Notification Logger Service
 * Database operations for notification lifecycle tracking
 */

import { db, notifications } from '@schedulebox/database';
import { eq } from 'drizzle-orm';

/**
 * Log notification as sent
 * @param notificationId Notification ID
 * @param messageId Message ID from delivery service (email messageId, SMS SID, etc.)
 */
export async function logNotificationSent(
  notificationId: number,
  messageId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        messageId,
      },
    })
    .where(eq(notifications.id, notificationId));

  console.log(`[Notification Logger] Notification ${notificationId} marked as sent`);
}

/**
 * Log notification as failed
 * @param notificationId Notification ID
 * @param error Error message
 */
export async function logNotificationFailed(notificationId: number, error: string): Promise<void> {
  await db
    .update(notifications)
    .set({
      status: 'failed',
      errorMessage: error,
    })
    .where(eq(notifications.id, notificationId));

  console.log(`[Notification Logger] Notification ${notificationId} marked as failed:`, error);
}

/**
 * Create notification record
 * @param data Notification data
 * @returns Notification ID
 */
export async function createNotificationRecord(data: {
  companyId: number;
  customerId?: number;
  bookingId?: number;
  templateId?: number;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  scheduledAt?: Date;
}): Promise<number> {
  const [notification] = await db
    .insert(notifications)
    .values({
      companyId: data.companyId,
      customerId: data.customerId ?? null,
      bookingId: data.bookingId ?? null,
      templateId: data.templateId ?? null,
      channel: data.channel,
      recipient: data.recipient,
      subject: data.subject ?? null,
      body: data.body,
      status: 'pending',
      scheduledAt: data.scheduledAt ?? null,
      metadata: {},
    })
    .onConflictDoNothing()
    .returning({ id: notifications.id });

  console.log(`[Notification Logger] Created notification record ${notification.id}`);
  return notification.id;
}
