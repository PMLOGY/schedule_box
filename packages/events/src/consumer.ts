/**
 * RabbitMQ CloudEvent consumer helper
 * Mirrors publisher pattern with callback-based amqplib API
 */

import * as amqp from 'amqplib/callback_api.js';
import type { CloudEvent } from './types';

const EXCHANGE_NAME = 'schedulebox.events';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://schedulebox:schedulebox@localhost:5672';

export interface ConsumerConnection {
  connection: amqp.Connection;
  channel: amqp.Channel;
}

export interface ConsumeOptions<T> {
  /** Queue name to consume from */
  queueName: string;

  /** Exchange name (defaults to 'schedulebox.events') */
  exchangeName?: string;

  /** Routing keys to bind to the queue */
  routingKeys: string[];

  /** Prefetch count (default: 10) */
  prefetch?: number;

  /** Message handler (ACK on success, NACK+requeue on error) */
  handler: (event: CloudEvent<T>, msg: amqp.Message) => Promise<void>;
}

/**
 * Create RabbitMQ consumer connection
 * Returns connection + channel with error/close handlers
 *
 * @param options Connection options
 * @returns Promise resolving to connection and channel
 */
export async function createConsumerConnection(options?: {
  url?: string;
}): Promise<ConsumerConnection> {
  const url = options?.url || RABBITMQ_URL;

  return new Promise((resolve, reject) => {
    amqp.connect(url, (err, connection) => {
      if (err) {
        console.error('[RabbitMQ Consumer] Failed to connect:', err);
        reject(err);
        return;
      }

      // Connection error/close handlers
      connection.on('error', (connErr) => {
        console.error('[RabbitMQ Consumer] Connection error:', connErr);
      });

      connection.on('close', () => {
        console.log('[RabbitMQ Consumer] Connection closed');
      });

      // Create channel
      connection.createChannel((chErr, channel) => {
        if (chErr) {
          console.error('[RabbitMQ Consumer] Failed to create channel:', chErr);
          reject(chErr);
          return;
        }

        // Channel error/close handlers
        channel.on('error', (channelErr) => {
          console.error('[RabbitMQ Consumer] Channel error:', channelErr);
        });

        channel.on('close', () => {
          console.log('[RabbitMQ Consumer] Channel closed');
        });

        console.log('[RabbitMQ Consumer] Connected successfully');
        resolve({ connection, channel });
      });
    });
  });
}

/**
 * Consume messages from a queue with CloudEvent deserialization
 * Asserts durable queue, binds routing keys, sets prefetch, ACKs on success / NACKs on error
 *
 * @param channel RabbitMQ channel
 * @param options Consumption options
 */
export async function consumeMessages<T>(
  channel: amqp.Channel,
  options: ConsumeOptions<T>,
): Promise<void> {
  const exchangeName = options.exchangeName || EXCHANGE_NAME;
  const prefetch = options.prefetch ?? 10;

  return new Promise((resolve, reject) => {
    // Assert exchange exists (producer should create, but defensive check)
    channel.assertExchange(exchangeName, 'topic', { durable: true }, (exErr) => {
      if (exErr) {
        console.error('[RabbitMQ Consumer] Failed to assert exchange:', exErr);
        reject(exErr);
        return;
      }

      // Assert durable queue
      channel.assertQueue(options.queueName, { durable: true }, (qErr, queueInfo) => {
        if (qErr) {
          console.error('[RabbitMQ Consumer] Failed to assert queue:', qErr);
          reject(qErr);
          return;
        }

        // Bind routing keys to queue
        let bindingsCompleted = 0;
        const totalBindings = options.routingKeys.length;

        if (totalBindings === 0) {
          reject(new Error('At least one routing key is required'));
          return;
        }

        options.routingKeys.forEach((routingKey) => {
          channel.bindQueue(queueInfo.queue, exchangeName, routingKey, {}, (bindErr) => {
            if (bindErr) {
              console.error(
                `[RabbitMQ Consumer] Failed to bind routing key ${routingKey}:`,
                bindErr,
              );
              reject(bindErr);
              return;
            }

            bindingsCompleted++;
            console.log(
              `[RabbitMQ Consumer] Bound queue "${options.queueName}" to routing key "${routingKey}"`,
            );

            // Once all bindings complete, start consuming
            if (bindingsCompleted === totalBindings) {
              // Set prefetch
              channel.prefetch(prefetch);

              // Start consuming
              channel.consume(
                queueInfo.queue,
                async (msg) => {
                  if (!msg) {
                    return; // Consumer cancelled
                  }

                  try {
                    // Deserialize CloudEvent from message
                    const event = JSON.parse(msg.content.toString()) as CloudEvent<T>;

                    // Call handler
                    await options.handler(event, msg);

                    // ACK on success
                    channel.ack(msg);
                  } catch (error) {
                    console.error('[RabbitMQ Consumer] Handler error:', error);

                    // NACK and requeue on error
                    channel.nack(msg, false, true);
                  }
                },
                { noAck: false },
                (consumeErr) => {
                  if (consumeErr) {
                    console.error('[RabbitMQ Consumer] Failed to start consuming:', consumeErr);
                    reject(consumeErr);
                    return;
                  }

                  console.log(
                    `[RabbitMQ Consumer] Started consuming queue "${options.queueName}" with prefetch ${prefetch}`,
                  );
                  resolve();
                },
              );
            }
          });
        });
      });
    });
  });
}

/**
 * Gracefully shutdown consumer connection
 * Closes channel then connection
 *
 * @param connection RabbitMQ connection
 * @param channel RabbitMQ channel
 */
export async function gracefulShutdown(
  connection: amqp.Connection,
  channel: amqp.Channel,
): Promise<void> {
  return new Promise((resolve) => {
    try {
      // Close channel first
      channel.close(() => {
        console.log('[RabbitMQ Consumer] Channel closed');

        // Then close connection
        connection.close(() => {
          console.log('[RabbitMQ Consumer] Connection closed gracefully');
          resolve();
        });
      });
    } catch (error) {
      console.error('[RabbitMQ Consumer] Error during graceful shutdown:', error);
      resolve();
    }
  });
}
