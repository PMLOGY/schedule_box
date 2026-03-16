/**
 * CloudEvent infrastructure for ScheduleBox
 * CloudEvents v1.0 implementation with domain event definitions
 * RabbitMQ removed — no-op publisher for Vercel serverless deployment
 */

// Core types
export type { CloudEvent, EventMetadata, DomainEvent } from './types';

// Publisher and utilities
export {
  publishEvent,
  createCloudEvent,
  closeConnection,
  createEventPublisher,
  validateCloudEvent,
} from './publisher';

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
} from './events/booking';

export {
  createBookingCreatedEvent,
  createBookingConfirmedEvent,
  createBookingCancelledEvent,
  createBookingCompletedEvent,
  createBookingNoShowEvent,
  createBookingRescheduledEvent,
} from './events/booking';

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
} from './events/payment';

export {
  createPaymentInitiatedEvent,
  createPaymentCompletedEvent,
  createPaymentFailedEvent,
  createPaymentRefundedEvent,
  createPaymentExpiredEvent,
} from './events/payment';

// Review domain events
export type { ReviewCreatedPayload, ReviewCreatedEvent } from './events/review';

export { createReviewCreatedEvent } from './events/review';

// Notification domain events
export type {
  NotificationSendRequestedPayload,
  NotificationSentPayload,
  NotificationFailedPayload,
  NotificationOpenedPayload,
  NotificationClickedPayload,
  NotificationSendRequestedEvent,
  NotificationSentEvent,
  NotificationFailedEvent,
  NotificationOpenedEvent,
  NotificationClickedEvent,
} from './events/notification';

export {
  createNotificationSendRequestedEvent,
  createNotificationSentEvent,
  createNotificationFailedEvent,
  createNotificationOpenedEvent,
  createNotificationClickedEvent,
} from './events/notification';

// Loyalty domain events
export type {
  LoyaltyCardCreatedPayload,
  PointsEarnedPayload,
  TierUpgradedPayload,
  RewardRedeemedPayload,
  LoyaltyCardCreatedEvent,
  PointsEarnedEvent,
  TierUpgradedEvent,
  RewardRedeemedEvent,
} from './events/loyalty';

export {
  createLoyaltyCardCreatedEvent,
  createPointsEarnedEvent,
  createTierUpgradedEvent,
  createRewardRedeemedEvent,
} from './events/loyalty';
