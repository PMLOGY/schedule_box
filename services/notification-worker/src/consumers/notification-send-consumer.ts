/**
 * Notification Send Consumer
 * Listens to notification.send_requested events and enqueues delivery jobs
 */

import type { Channel, Message } from 'amqplib';
import type { Queue } from 'bullmq';
import type { NotificationSendRequestedEvent } from '@schedulebox/events';

const QUEUE_NAME = 'notification-worker.send';
const ROUTING_KEY = 'notification.send_requested';

/**
 * BullMQ queues interface
 */
interface Queues {
  emailQueue: Queue;
  smsQueue: Queue;
  pushQueue: Queue;
}

/**
 * Handle notification.send_requested event
 * Enqueues the notification to the appropriate channel queue
 */
async function handleSendRequested(
  event: NotificationSendRequestedEvent,
  queues: Queues,
): Promise<void> {
  const { notificationId, companyId, channel, recipient, subject, body } = event.data;

  console.log(
    `[Notification Send Consumer] Processing send request for notification ${notificationId} via ${channel}`,
  );

  const jobId = `manual-send-${event.id}`;

  switch (channel) {
    case 'email':
      await queues.emailQueue.add(
        'send-email',
        {
          companyId,
          recipient,
          subject: subject || '(no subject)',
          html: body,
          notificationId,
          eventId: event.id,
        },
        {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      break;

    case 'sms':
      await queues.smsQueue.add(
        'send-sms',
        {
          companyId,
          recipient,
          body,
          notificationId,
        },
        {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      break;

    case 'push':
      await queues.pushQueue.add(
        'send-push',
        {
          companyId,
          recipient,
          title: subject || 'Notification',
          body,
          notificationId,
        },
        {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      break;

    default:
      console.warn(`[Notification Send Consumer] Unknown channel: ${channel}`);
  }
}

/**
 * Set up the notification send consumer
 * Binds to notification.send_requested routing key
 */
export async function setupNotificationSendConsumer(
  channel: Channel,
  queues: Queues,
): Promise<void> {
  // Assert durable queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  // Bind queue to exchange with routing key
  await channel.bindQueue(QUEUE_NAME, 'schedulebox.events', ROUTING_KEY);

  // Set prefetch
  channel.prefetch(10);

  // Start consuming
  channel.consume(QUEUE_NAME, async (msg: Message | null) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString()) as NotificationSendRequestedEvent;
      await handleSendRequested(event, queues);
      channel.ack(msg);
    } catch (error) {
      console.error('[Notification Send Consumer] Error processing message:', error);
      // NACK with requeue on error
      channel.nack(msg, false, true);
    }
  });

  console.log(`[Notification Send Consumer] Listening on queue: ${QUEUE_NAME}`);
}
