/**
 * Business-specific Prometheus metrics
 *
 * These counters track ScheduleBox business events and will be
 * incremented by application code (not auto-populated like Node.js metrics).
 */

import { Counter, Histogram } from 'prom-client';
import { register } from './index';

// Booking metrics
export const bookingsTotalCounter = new Counter({
  name: 'schedulebox_bookings_total',
  help: 'Total number of bookings created',
  labelNames: ['company_id', 'status', 'source'],
  registers: [register],
});

// Payment metrics
export const paymentsTotalCounter = new Counter({
  name: 'schedulebox_payments_total',
  help: 'Total number of payments processed',
  labelNames: ['company_id', 'gateway', 'status'],
  registers: [register],
});

// Notification metrics
export const notificationsTotalCounter = new Counter({
  name: 'schedulebox_notifications_total',
  help: 'Total number of notifications sent',
  labelNames: ['channel', 'status'],
  registers: [register],
});

// AI prediction metrics
export const aiPredictionDuration = new Histogram({
  name: 'schedulebox_ai_prediction_duration_seconds',
  help: 'AI prediction request duration in seconds',
  labelNames: ['model_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 15],
  registers: [register],
});
