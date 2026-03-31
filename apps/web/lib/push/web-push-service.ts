/**
 * Web Push Notification Service
 *
 * Server-side service for sending push notifications via the Web Push protocol.
 * Uses VAPID authentication for push server authorization.
 *
 * Environment variables required:
 * - VAPID_PUBLIC_KEY: Base64-encoded public key
 * - VAPID_PRIVATE_KEY: Base64-encoded private key
 */

import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '@schedulebox/database';
import { pushSubscriptions } from '@schedulebox/database';

// Configure VAPID details on module load (lazy — only when actually called)
let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.',
    );
  }

  webpush.setVapidDetails('mailto:admin@schedulebox.cz', publicKey, privateKey);
  vapidConfigured = true;
}

/**
 * Push notification payload
 */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

/**
 * Push subscription shape matching Web Push API
 */
interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Send a push notification to a single subscription.
 *
 * @returns true on success, false if subscription expired (410 Gone)
 * @throws Error on other failures
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload,
): Promise<boolean> {
  ensureVapidConfigured();

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon || '/icons/icon-192x192.png',
    tag: payload.tag || 'schedulebox-notification',
  });

  try {
    await webpush.sendNotification(subscription, notificationPayload);
    return true;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    // 410 Gone = subscription expired, caller should delete it
    if (statusCode === 410 || statusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Send push notification to all subscriptions for a user.
 * Automatically cleans up expired subscriptions (410 Gone).
 *
 * @returns Counts of sent, failed, and expired (cleaned up) subscriptions
 */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
): Promise<{ sent: number; failed: number; expired: number }> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const result = { sent: 0, failed: 0, expired: 0 };

  for (const sub of subscriptions) {
    try {
      const success = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keysP256dh,
            auth: sub.keysAuth,
          },
        },
        payload,
      );

      if (success) {
        result.sent++;
      } else {
        // Subscription expired — clean up
        result.expired++;
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      }
    } catch {
      result.failed++;
    }
  }

  return result;
}
