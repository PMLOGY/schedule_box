/**
 * RabbitMQ event infrastructure for ScheduleBox
 * CloudEvents v1.0 implementation with domain event definitions
 */

// Core types
export type { CloudEvent, EventMetadata, DomainEvent } from './types.js';

// Publisher and utilities
export {
  publishEvent,
  createCloudEvent,
  closeConnection,
  createEventPublisher,
} from './publisher.js';

// Consumer helper
export type { ConsumerConnection, ConsumeOptions } from './consumer.js';
export { createConsumerConnection, consumeMessages, gracefulShutdown } from './consumer.js';

// Booking domain events
export type {
  BookingCreatedPayload,
  BookingConfirmedPayload,
  BookingCancelledPayload,
  BookingCompletedPayload,
  BookingNoShowPayload,
  BookingRescheduledPayload,
  BookingCreatedEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  BookingCompletedEvent,
  BookingNoShowEvent,
  BookingRescheduledEvent,
} from './events/booking.js';

export {
  createBookingCreatedEvent,
  createBookingConfirmedEvent,
  createBookingCancelledEvent,
  createBookingCompletedEvent,
  createBookingNoShowEvent,
  createBookingRescheduledEvent,
} from './events/booking.js';

// Payment domain events
export type {
  PaymentInitiatedPayload,
  PaymentCompletedPayload,
  PaymentFailedPayload,
  PaymentRefundedPayload,
  PaymentExpiredPayload,
  PaymentInitiatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentRefundedEvent,
  PaymentExpiredEvent,
} from './events/payment.js';

export {
  createPaymentInitiatedEvent,
  createPaymentCompletedEvent,
  createPaymentFailedEvent,
  createPaymentRefundedEvent,
  createPaymentExpiredEvent,
} from './events/payment.js';

// Review domain events
export type { ReviewCreatedPayload, ReviewCreatedEvent } from './events/review.js';

export { createReviewCreatedEvent } from './events/review.js';

// Notification domain events
export type {
  NotificationSentPayload,
  NotificationFailedPayload,
  NotificationOpenedPayload,
  NotificationClickedPayload,
  NotificationSentEvent,
  NotificationFailedEvent,
  NotificationOpenedEvent,
  NotificationClickedEvent,
} from './events/notification.js';

export {
  createNotificationSentEvent,
  createNotificationFailedEvent,
  createNotificationOpenedEvent,
  createNotificationClickedEvent,
} from './events/notification.js';
