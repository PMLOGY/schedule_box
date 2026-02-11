/**
 * Notification domain event definitions
 * CloudEvents for notification lifecycle
 */

import { createCloudEvent } from '../publisher';
import type { CloudEvent } from '../types';

// Event type constants
const EVENT_SOURCE = 'notification-service';
const EVENT_TYPE_PREFIX = 'com.schedulebox.notification';

/**
 * Notification sent event payload
 * Emitted when a notification is successfully sent
 */
export interface NotificationSentPayload {
  /** Notification ID */
  notificationId: number;

  /** Company/tenant ID */
  companyId: number;

  /** Notification channel (email, sms, push) */
  channel: string;

  /** Recipient (email, phone, device token) */
  recipient: string;

  /** Template type used */
  templateType: string;

  /** Timestamp when notification was sent (ISO 8601) */
  sentAt: string;
}

/**
 * Notification failed event payload
 * Emitted when notification sending fails
 */
export interface NotificationFailedPayload {
  /** Notification ID */
  notificationId: number;

  /** Company/tenant ID */
  companyId: number;

  /** Notification channel */
  channel: string;

  /** Recipient */
  recipient: string;

  /** Error message */
  error: string;

  /** Timestamp when notification failed (ISO 8601) */
  failedAt: string;
}

/**
 * Notification opened event payload
 * Emitted when recipient opens email/push notification
 */
export interface NotificationOpenedPayload {
  /** Notification ID */
  notificationId: number;

  /** Company/tenant ID */
  companyId: number;

  /** Timestamp when notification was opened (ISO 8601) */
  openedAt: string;
}

/**
 * Notification clicked event payload
 * Emitted when recipient clicks link in notification
 */
export interface NotificationClickedPayload {
  /** Notification ID */
  notificationId: number;

  /** Company/tenant ID */
  companyId: number;

  /** Clicked URL */
  url: string;

  /** Timestamp when link was clicked (ISO 8601) */
  clickedAt: string;
}

// Type aliases for CloudEvents
export type NotificationSentEvent = CloudEvent<NotificationSentPayload>;
export type NotificationFailedEvent = CloudEvent<NotificationFailedPayload>;
export type NotificationOpenedEvent = CloudEvent<NotificationOpenedPayload>;
export type NotificationClickedEvent = CloudEvent<NotificationClickedPayload>;

/**
 * Create a notification sent event
 */
export function createNotificationSentEvent(data: NotificationSentPayload): NotificationSentEvent {
  return createCloudEvent(
    `${EVENT_TYPE_PREFIX}.sent`,
    EVENT_SOURCE,
    data,
    data.notificationId.toString(),
  );
}

/**
 * Create a notification failed event
 */
export function createNotificationFailedEvent(
  data: NotificationFailedPayload,
): NotificationFailedEvent {
  return createCloudEvent(
    `${EVENT_TYPE_PREFIX}.failed`,
    EVENT_SOURCE,
    data,
    data.notificationId.toString(),
  );
}

/**
 * Create a notification opened event
 */
export function createNotificationOpenedEvent(
  data: NotificationOpenedPayload,
): NotificationOpenedEvent {
  return createCloudEvent(
    `${EVENT_TYPE_PREFIX}.opened`,
    EVENT_SOURCE,
    data,
    data.notificationId.toString(),
  );
}

/**
 * Create a notification clicked event
 */
export function createNotificationClickedEvent(
  data: NotificationClickedPayload,
): NotificationClickedEvent {
  return createCloudEvent(
    `${EVENT_TYPE_PREFIX}.clicked`,
    EVENT_SOURCE,
    data,
    data.notificationId.toString(),
  );
}
