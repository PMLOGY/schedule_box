/**
 * RabbitMQ CloudEvent publisher
 * Fire-and-forget semantics for MVP (reliable delivery in Phase 7)
 */

import * as amqp from 'amqplib/callback_api.js';
import { randomUUID } from 'node:crypto';
import type { CloudEvent } from './types.js';

// Singleton connection and channel
let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

const EXCHANGE_NAME = 'schedulebox.events';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://schedulebox:schedulebox@localhost:5672';

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
 * Publish a CloudEvent to RabbitMQ
 * Fire-and-forget: logs errors but does not throw (MVP behavior)
 *
 * @param event CloudEvent to publish
 */
export async function publishEvent<T>(event: CloudEvent<T>): Promise<void> {
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
    }
  } catch (error) {
    // Fire-and-forget: log but don't throw (MVP)
    // In Phase 7, this will use persistent queue with retry
    console.error('[RabbitMQ] Failed to publish event:', event.type, error);
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
