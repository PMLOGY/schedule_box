/**
 * RabbitMQ CloudEvent consumer helper
 * Supports dead letter queues, max retry counts, and exponential backoff.
 */

import * as amqp from 'amqplib/callback_api.js';
import type { CloudEvent } from './types';
import { validateCloudEvent } from './publisher';

const EXCHANGE_NAME = 'schedulebox.events';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://schedulebox:schedulebox@localhost:5672';

/** Dead letter exchange name */
const DLX_EXCHANGE_NAME = 'schedulebox.events.dlx';

/** Default max retry attempts before sending to DLQ */
const DEFAULT_MAX_RETRIES = 3;

/** Header key used to track retry count */
const RETRY_COUNT_HEADER = 'x-retry-count';

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

  /** Max retry attempts before sending to DLQ (default: 3) */
  maxRetries?: number;

  /** Message handler (ACK on success, NACK+requeue on error up to maxRetries) */
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
 * Get the retry count from message headers
 */
function getRetryCount(msg: amqp.Message): number {
  const headers = msg.properties?.headers;
  if (!headers || headers[RETRY_COUNT_HEADER] === undefined) {
    return 0;
  }
  return Number(headers[RETRY_COUNT_HEADER]) || 0;
}

/**
 * Assert dead letter exchange and queue for a given consumer queue.
 * DLQ name follows pattern: {queueName}.dlq
 */
function assertDeadLetterInfra(
  channel: amqp.Channel,
  queueName: string,
  callback: (err?: Error) => void,
): void {
  // Assert the dead letter exchange (fanout so all DLQ messages land in one queue)
  channel.assertExchange(DLX_EXCHANGE_NAME, 'fanout', { durable: true }, (exErr) => {
    if (exErr) {
      callback(exErr);
      return;
    }

    const dlqName = `${queueName}.dlq`;
    channel.assertQueue(dlqName, { durable: true }, (qErr) => {
      if (qErr) {
        callback(qErr);
        return;
      }

      // Bind DLQ to the DLX exchange
      channel.bindQueue(dlqName, DLX_EXCHANGE_NAME, '', {}, (bindErr) => {
        if (bindErr) {
          callback(bindErr);
          return;
        }

        console.log(`[RabbitMQ Consumer] Dead letter queue "${dlqName}" ready`);
        callback();
      });
    });
  });
}

/**
 * Consume messages from a queue with CloudEvent deserialization.
 * Supports dead letter queue and max retry count.
 *
 * - On handler success: ACK
 * - On handler error with retries remaining: NACK + requeue with incremented retry header
 * - On handler error with retries exhausted: publish to DLX, ACK original
 * - On JSON parse error (poison pill): publish to DLX immediately, ACK original
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
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  return new Promise((resolve, reject) => {
    // Assert dead letter infrastructure first
    assertDeadLetterInfra(channel, options.queueName, (dlxErr) => {
      if (dlxErr) {
        console.error('[RabbitMQ Consumer] Failed to set up DLQ:', dlxErr);
        reject(dlxErr);
        return;
      }

      // Assert main exchange
      channel.assertExchange(exchangeName, 'topic', { durable: true }, (exErr) => {
        if (exErr) {
          console.error('[RabbitMQ Consumer] Failed to assert exchange:', exErr);
          reject(exErr);
          return;
        }

        // Assert durable queue with dead letter exchange
        channel.assertQueue(
          options.queueName,
          {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': DLX_EXCHANGE_NAME,
            },
          },
          (qErr, queueInfo) => {
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

                      const retryCount = getRetryCount(msg);

                      // Attempt to parse and handle
                      let event: CloudEvent<T>;
                      try {
                        event = JSON.parse(msg.content.toString()) as CloudEvent<T>;

                        // Validate CloudEvent envelope
                        const validationError = validateCloudEvent(event);
                        if (validationError) {
                          console.error(
                            `[RabbitMQ Consumer] Invalid CloudEvent in "${options.queueName}": ${validationError}, sending to DLQ`,
                          );
                          sendToDlx(channel, msg, `invalid_cloudevent: ${validationError}`, 0);
                          channel.ack(msg);
                          return;
                        }
                      } catch (parseError) {
                        // Poison pill — unparseable message, send directly to DLX
                        console.error(
                          `[RabbitMQ Consumer] Poison pill in "${options.queueName}" — unparseable message, sending to DLQ:`,
                          parseError,
                        );
                        sendToDlx(channel, msg, 'json_parse_error', 0);
                        channel.ack(msg);
                        return;
                      }

                      try {
                        // Call handler
                        await options.handler(event, msg);

                        // ACK on success
                        channel.ack(msg);
                      } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);

                        if (retryCount < maxRetries) {
                          // Retries remaining — NACK and requeue with incremented count
                          console.warn(
                            `[RabbitMQ Consumer] Handler error in "${options.queueName}" (attempt ${retryCount + 1}/${maxRetries}): ${errorMsg}`,
                          );

                          // Republish with incremented retry header, then ACK original
                          const updatedHeaders = {
                            ...(msg.properties.headers || {}),
                            [RETRY_COUNT_HEADER]: retryCount + 1,
                          };

                          channel.publish(exchangeName, msg.fields.routingKey, msg.content, {
                            ...msg.properties,
                            headers: updatedHeaders,
                          });
                          channel.ack(msg);
                        } else {
                          // Max retries exhausted — send to DLQ
                          console.error(
                            `[RabbitMQ Consumer] Max retries (${maxRetries}) exhausted for message in "${options.queueName}": ${errorMsg}`,
                          );
                          sendToDlx(channel, msg, errorMsg, retryCount);
                          channel.ack(msg);
                        }
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
                        `[RabbitMQ Consumer] Started consuming queue "${options.queueName}" with prefetch ${prefetch}, maxRetries ${maxRetries}`,
                      );
                      resolve();
                    },
                  );
                }
              });
            });
          },
        );
      });
    });
  });
}

/**
 * Send a failed message to the dead letter exchange with error metadata.
 */
function sendToDlx(
  channel: amqp.Channel,
  originalMsg: amqp.Message,
  errorReason: string,
  retryCount: number,
): void {
  try {
    channel.publish(DLX_EXCHANGE_NAME, '', originalMsg.content, {
      ...originalMsg.properties,
      headers: {
        ...(originalMsg.properties.headers || {}),
        'x-dlq-reason': errorReason,
        'x-dlq-retry-count': retryCount,
        'x-dlq-timestamp': new Date().toISOString(),
        'x-dlq-original-routing-key': originalMsg.fields.routingKey,
      },
    });
  } catch (dlxError) {
    console.error('[RabbitMQ Consumer] Failed to send message to DLX:', dlxError);
  }
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
