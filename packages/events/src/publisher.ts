/**
 * No-op CloudEvent publisher for Vercel serverless deployment.
 * RabbitMQ removed — all downstream actions (notifications, loyalty, analytics)
 * are handled synchronously within the API route that creates the event.
 */

import { randomUUID } from 'node:crypto';
import type { CloudEvent } from './types';

/**
 * Validate CloudEvent envelope structure at runtime.
 */
export function validateCloudEvent<T>(event: CloudEvent<T>): string | null {
  if (!event) return 'Event is null or undefined';
  if (event.specversion !== '1.0') return `Invalid specversion: ${event.specversion}`;
  if (!event.type || typeof event.type !== 'string') return 'Missing or invalid event type';
  if (!event.source || typeof event.source !== 'string') return 'Missing or invalid event source';
  if (!event.id || typeof event.id !== 'string') return 'Missing or invalid event id';
  if (!event.time || typeof event.time !== 'string') return 'Missing or invalid event time';
  if (event.data === undefined || event.data === null) return 'Missing event data payload';

  // Warn if domain events are missing companyId for tenant isolation
  const data = event.data as Record<string, unknown>;
  if (typeof data === 'object' && !('companyId' in data)) {
    console.warn(`[events] Event ${event.type} missing companyId in payload`);
  }

  return null;
}

/**
 * Publish a CloudEvent — no-op for Vercel serverless deployment.
 *
 * RabbitMQ is not supported on Vercel. All downstream actions are handled
 * synchronously within the API route that creates the event.
 *
 * @param event CloudEvent to publish
 */
export async function publishEvent<T>(event: CloudEvent<T>): Promise<void> {
  // RabbitMQ removed for Vercel serverless deployment.
  // All downstream actions (notifications, loyalty, analytics) are
  // handled synchronously within the API route that creates the event.
  if (process.env.NODE_ENV === 'development') {
    console.log('[events] no-op publish:', event.type, event.subject ?? '');
  }
}

/**
 * Create a CloudEvent with generated ID and timestamp
 *
 * @param type Event type (e.g., 'com.schedulebox.booking.created')
 * @param source Event source (e.g., 'booking-service')
 * @param data Event payload data
 * @param subject Optional subject (entity UUID)
 */
export function createCloudEvent<T>(
  type: string,
  source: string,
  data: T,
  subject?: string,
): CloudEvent<T> {
  return {
    specversion: '1.0',
    type,
    source,
    id: randomUUID(),
    time: new Date().toISOString(),
    subject,
    datacontenttype: 'application/json',
    data,
  };
}

/**
 * Gracefully close connection — no-op (no connection to close).
 */
export async function closeConnection(): Promise<void> {
  return Promise.resolve();
}

/**
 * Factory function for creating event publisher
 * Useful for dependency injection in tests
 */
export function createEventPublisher() {
  return {
    publishEvent,
    createCloudEvent,
    closeConnection,
  };
}
