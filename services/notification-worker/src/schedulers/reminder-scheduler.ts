/**
 * Reminder Scheduler
 * Scans for upcoming bookings and enqueues reminder notifications at 24h and 2h before appointment
 */

import { Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { between, and, inArray, eq, isNull, sql } from 'drizzle-orm';
import { db, bookings, customers, services, employees, notifications } from '@schedulebox/database';
import { renderTemplateFile } from '../services/template-renderer.js';

const REMINDER_QUEUE_NAME = 'notification:reminders';
const SCANNER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Type for reminder window
 */
type ReminderType = '24h' | '2h';

/**
 * Start the reminder scheduler
 */
export async function startReminderScheduler(
  emailQueue: Queue,
  smsQueue: Queue,
  redisConnection: ConnectionOptions,
): Promise<{ queue: Queue; worker: Worker }> {
  // Create the reminders queue for the repeatable job
  const remindersQueue = new Queue(REMINDER_QUEUE_NAME, {
    connection: redisConnection,
  });

  // Add the repeatable job (runs every 15 minutes)
  await remindersQueue.add(
    'scan-reminders',
    {},
    {
      repeat: {
        every: SCANNER_INTERVAL_MS,
      },
      jobId: 'reminder-scanner',
    },
  );

  console.log('[Reminder Scheduler] Repeatable job added (every 15 minutes)');

  // Create the worker that processes the scan job
  const worker = new Worker(
    REMINDER_QUEUE_NAME,
    async () => {
      await scanAndEnqueueReminders(emailQueue, smsQueue);
    },
    {
      connection: redisConnection,
      concurrency: 1, // Only one scanner should run at a time
    },
  );

  worker.on('completed', (job) => {
    console.log(`[Reminder Scheduler] Scan job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Reminder Scheduler] Scan job ${job?.id} failed:`, error);
  });

  console.log('[Reminder Scheduler] Worker started');

  return { queue: remindersQueue, worker };
}

/**
 * Scan for bookings needing reminders and enqueue notification jobs
 */
async function scanAndEnqueueReminders(emailQueue: Queue, smsQueue: Queue): Promise<void> {
  const now = new Date();

  // Calculate time windows (all in UTC)
  // 24h window: now + 23h45m to now + 24h15m (30-min window)
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 45 * 60 * 1000);
  const window24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000);

  // 2h window: now + 1h45m to now + 2h15m (30-min window)
  const window2hStart = new Date(now.getTime() + 1 * 60 * 60 * 1000 + 45 * 60 * 1000);
  const window2hEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000);

  // Scan 24h window
  const count24h = await scanWindow(window24hStart, window24hEnd, '24h', emailQueue, smsQueue);

  // Scan 2h window
  const count2h = await scanWindow(window2hStart, window2hEnd, '2h', emailQueue, smsQueue);

  console.log(
    `[Reminder Scheduler] Scanned reminders: ${count24h} x 24h, ${count2h} x 2h reminders enqueued`,
  );
}

/**
 * Scan a specific time window for bookings needing reminders
 */
async function scanWindow(
  windowStart: Date,
  windowEnd: Date,
  reminderType: ReminderType,
  emailQueue: Queue,
  smsQueue: Queue,
): Promise<number> {
  // Query bookings in the window
  const bookingsInWindow = await db
    .select({
      id: bookings.id,
      uuid: bookings.uuid,
      companyId: bookings.companyId,
      startTime: bookings.startTime,
      price: bookings.price,
      currency: bookings.currency,
      // Customer fields
      customerId: customers.id,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerName: customers.name,
      // Service fields
      serviceName: services.name,
      // Employee fields
      employeeName: employees.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(employees, eq(bookings.employeeId, employees.id))
    .where(
      and(
        between(bookings.startTime, windowStart, windowEnd),
        inArray(bookings.status, ['confirmed', 'pending']),
        isNull(bookings.deletedAt),
      ),
    );

  let enqueueCount = 0;

  for (const booking of bookingsInWindow) {
    // Check if reminder already sent (idempotency check)
    const existingReminder = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.bookingId, booking.id),
          eq(notifications.channel, 'email'),
          sql`${notifications.subject} LIKE '%připomenut%'`,
          sql`${notifications.status} != 'failed'`,
        ),
      )
      .limit(1);

    if (existingReminder.length > 0) {
      // Reminder already exists, skip
      continue;
    }

    // Fetch booking_reminder template for company (or use default)
    const dbTemplate = await db.query.notificationTemplates.findFirst({
      where: (templates, { eq, and }) =>
        and(
          eq(templates.companyId, booking.companyId),
          eq(templates.type, 'booking_reminder'),
          eq(templates.channel, 'email'),
          eq(templates.isActive, true),
        ),
    });

    // Prepare template data
    const templateData = {
      customer_name: booking.customerName,
      service_name: booking.serviceName,
      booking_date: booking.startTime,
      booking_time: booking.startTime,
      employee_name: booking.employeeName || 'náš tým',
      company_name: 'ScheduleBox', // TODO: fetch from company settings
      price: booking.price,
      currency: booking.currency,
    };

    // Render email content
    let emailSubject: string;
    let emailHtml: string;

    if (dbTemplate) {
      // Use custom template
      emailSubject = dbTemplate.subject || 'Připomínka termínu';
      emailHtml = await renderTemplateFile(dbTemplate.bodyTemplate, 'email', templateData);
    } else {
      // Use default file template
      emailSubject = 'Připomínka termínu';
      emailHtml = await renderTemplateFile('booking-reminder', 'email', templateData);
    }

    // Enqueue email reminder
    const emailJobId = `reminder-${booking.id}-${reminderType}`;
    await emailQueue.add(
      'send-email',
      {
        companyId: booking.companyId,
        recipient: booking.customerEmail,
        subject: emailSubject,
        html: emailHtml,
        customerId: booking.customerId,
        bookingId: booking.id,
        templateId: dbTemplate?.id,
      },
      {
        jobId: emailJobId,
      },
    );

    enqueueCount++;

    // Enqueue SMS reminder if customer has phone
    if (booking.customerPhone) {
      // SMS template (short format)
      let smsBody: string;

      const smsTemplate = await db.query.notificationTemplates.findFirst({
        where: (templates, { eq, and }) =>
          and(
            eq(templates.companyId, booking.companyId),
            eq(templates.type, 'booking_reminder'),
            eq(templates.channel, 'sms'),
            eq(templates.isActive, true),
          ),
      });

      if (smsTemplate) {
        // Use custom SMS template
        smsBody = await renderTemplateFile(smsTemplate.bodyTemplate, 'sms', templateData);
      } else {
        // Use default SMS template
        smsBody = await renderTemplateFile('booking-reminder', 'sms', templateData);
      }

      const smsJobId = `reminder-sms-${booking.id}-${reminderType}`;
      await smsQueue.add(
        'send-sms',
        {
          companyId: booking.companyId,
          recipient: booking.customerPhone,
          body: smsBody,
          customerId: booking.customerId,
          bookingId: booking.id,
          templateId: smsTemplate?.id,
        },
        {
          jobId: smsJobId,
        },
      );
    }
  }

  return enqueueCount;
}
