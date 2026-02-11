/**
 * Push Notification Sender Service
 * Web Push with VAPID protocol
 */

import webpush from 'web-push';
import { config } from '../config.js';

let isConfigured = false;

/**
 * Configure web-push with VAPID details
 */
function configureWebPush() {
  if (isConfigured) {
    return true;
  }

  if (!config.vapid.publicKey || !config.vapid.privateKey) {
    return false;
  }

  webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);

  isConfigured = true;
  return true;
}

/**
 * Send web push notification
 * @param subscription Push subscription object from client
 * @param payload Notification payload
 */
export async function sendPushNotification(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  payload: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
  },
): Promise<void> {
  const configured = configureWebPush();

  // Development mode: VAPID not configured
  if (!configured) {
    console.warn('[Push Sender] VAPID keys not configured, skipping push notification');
    return;
  }

  try {
    const pushPayload = JSON.stringify(payload);

    await webpush.sendNotification(subscription, pushPayload);

    console.log(
      `[Push Sender] Sent push notification to ${subscription.endpoint.substring(0, 50)}...`,
    );
  } catch (error) {
    console.error('[Push Sender] Failed to send push notification:', error);
    throw error;
  }
}
