/**
 * RabbitMQ CloudEvent publisher
 * Publishes events with retry logic and exponential backoff.
 * Throws on failure so callers can handle event delivery errors.
 */

import * as amqp from 'amqplib/callback_api.js';
import { randomUUID } from 'node:crypto';
import type { CloudEvent } from './types';

// Singleton connection and channel
let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

const EXCHANGE_NAME = 'schedulebox.events';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://schedulebox:schedulebox@localhost:5672';

/** Publisher configuration */
const PUBLISH_RETRY_ATTEMPTS = 3;
const PUBLISH_RETRY_BASE_DELAY_MS = 500;

/**
 * Get or create RabbitMQ channel
 * Lazily creates connection on first use
 */
async function getChannel(): Promise<amqp.Channel> {
  if (channel) {
    return channel;
  }

  return new Promise((resolve, reject) => {
    // Create connection if not exists
    if (!connection) {
      amqp.connect(RABBITMQ_URL, (err, conn) => {
        if (err) {
          console.error('[RabbitMQ] Failed to connect:', err);
          reject(err);
          return;
        }

        connection = conn;
        connection.on('error', (connErr) => {
          console.error('[RabbitMQ] Connection error:', connErr);
          connection = null;
          channel = null;
        });
        connection.on('close', () => {
          console.log('[RabbitMQ] Connection closed');
          connection = null;
          channel = null;
        });

        // Create channel after connection
        createChannelFromConnection(connection, resolve, reject);
      });
    } else {
      // Use existing connection
      createChannelFromConnection(connection, resolve, reject);
    }
  });
}

/**
 * Helper to create channel from existing connection
 */
function createChannelFromConnection(
  conn: amqp.Connection,
  resolve: (ch: amqp.Channel) => void,
  reject: (err: Error) => void,
) {
  conn.createChannel((err, ch) => {
    if (err) {
      console.error('[RabbitMQ] Failed to create channel:', err);
      channel = null;
      reject(err);
      return;
    }

    channel = ch;
    channel.on('error', (chErr) => {
      console.error('[RabbitMQ] Channel error:', chErr);
      channel = null;
    });
    channel.on('close', () => {
      console.log('[RabbitMQ] Channel closed');
      channel = null;
    });

    // Assert topic exchange (durable for persistence)
    channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true }, (exErr) => {
      if (exErr) {
        console.error('[RabbitMQ] Failed to assert exchange:', exErr);
        channel = null;
        reject(exErr);
        return;
      }

      console.log('[RabbitMQ] Connected successfully');
      if (channel) {
        resolve(channel);
      } else {
        reject(new Error('Channel was unexpectedly null after creation'));
      }
    });
  });
}

/**
 * Derive routing key from event type
 * com.schedulebox.booking.created -> booking.created
 */
function deriveRoutingKey(eventType: string): string {
  const parts = eventType.split('.');
  // Remove 'com.schedulebox' prefix
  return parts.slice(2).join('.');
}

/**
 * Sleep helper for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate CloudEvent envelope structure at runtime.
 * Catches malformed events before they reach RabbitMQ.
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
    console.warn(`[RabbitMQ] Event ${event.type} missing companyId in payload`);
  }

  return null;
}

/**
 * Publish a CloudEvent to RabbitMQ with retry logic.
 *
 * Validates the event envelope, then retries up to PUBLISH_RETRY_ATTEMPTS
 * times with exponential backoff. Throws on failure after all retries are
 * exhausted so callers can handle event delivery errors.
 *
 * @param event CloudEvent to publish
 * @throws Error if event is invalid or publishing fails after all retry attempts
 */
export async function publishEvent<T>(event: CloudEvent<T>): Promise<void> {
  // Validate event envelope before attempting to publish
  const validationError = validateCloudEvent(event);
  if (validationError) {
    const msg = `[RabbitMQ] Invalid event rejected: ${validationError}`;
    console.error(msg, event?.type);
    throw new Error(msg);
  }

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= PUBLISH_RETRY_ATTEMPTS; attempt++) {
    try {
      const ch = await getChannel();
      const routingKey = deriveRoutingKey(event.type);

      // Serialize event to JSON
      const message = Buffer.from(JSON.stringify(event));

      // Publish with CloudEvents headers
      const published = ch.publish(EXCHANGE_NAME, routingKey, message, {
        contentType: 'application/json',
        persistent: true, // Survive broker restart
        messageId: event.id,
        timestamp: Date.now(),
        headers: {
          specversion: event.specversion,
          type: event.type,
          source: event.source,
        },
      });

      if (!published) {
        console.warn(`[RabbitMQ] Message buffered (flow control): ${event.type}`);
        // Channel buffer is full but message is queued internally — not a failure
      }

      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Reset channel so next attempt reconnects
      channel = null;

      if (attempt < PUBLISH_RETRY_ATTEMPTS) {
        const delay = PUBLISH_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[RabbitMQ] Publish attempt ${attempt}/${PUBLISH_RETRY_ATTEMPTS} failed for ${event.type}, retrying in ${delay}ms:`,
          error,
        );
        await sleep(delay);
      }
    }
  }

  // All retries exhausted — throw so caller can handle
  const errorMsg = `[RabbitMQ] Failed to publish event ${event.type} after ${PUBLISH_RETRY_ATTEMPTS} attempts`;
  console.error(errorMsg, lastError);
  throw new Error(`${errorMsg}: ${lastError?.message}`);
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
 * Gracefully close RabbitMQ connection
 * Call during application shutdown
 */
export async function closeConnection(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (channel) {
        channel.close(() => {
          channel = null;
          if (connection) {
            connection.close(() => {
              connection = null;
              console.log('[RabbitMQ] Connection closed gracefully');
              resolve();
            });
          } else {
            resolve();
          }
        });
      } else if (connection) {
        connection.close(() => {
          connection = null;
          console.log('[RabbitMQ] Connection closed gracefully');
          resolve();
        });
      } else {
        resolve();
      }
    } catch (error) {
      console.error('[RabbitMQ] Error closing connection:', error);
      resolve();
    }
  });
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
