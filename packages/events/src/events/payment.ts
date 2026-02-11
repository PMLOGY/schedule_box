/**
 * Payment domain event definitions
 * CloudEvents for payment lifecycle state changes
 */

import { createCloudEvent } from '../publisher.js';
import type { CloudEvent } from '../types.js';

// Event type constants
const EVENT_SOURCE = 'payment-service';
const EVENT_TYPE_PREFIX = 'com.schedulebox.payment';

/**
 * Payment initiated event payload
 * Emitted when a payment process is started
 */
export interface PaymentInitiatedPayload {
  /** Payment UUID (public identifier) */
  paymentUuid: string;

  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Payment amount (decimal as string) */
  amount: string;

  /** Currency code (e.g., 'CZK', 'EUR') */
  currency: string;

  /** Payment gateway (e.g., 'comgate', 'qrcomat', 'cash') */
  gateway: string;

  /** Gateway transaction ID (null if not yet assigned) */
  gatewayTransactionId: string | null;
}

/**
 * Payment completed event payload
 * Emitted when payment is successfully processed
 */
export interface PaymentCompletedPayload {
  /** Payment UUID */
  paymentUuid: string;

  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Payment amount (decimal as string) */
  amount: string;

  /** Currency code */
  currency: string;

  /** Payment gateway */
  gateway: string;

  /** Gateway transaction ID */
  gatewayTransactionId: string;

  /** Timestamp when payment was completed (ISO 8601) */
  paidAt: string;
}

/**
 * Payment failed event payload
 * Emitted when payment processing fails
 */
export interface PaymentFailedPayload {
  /** Payment UUID */
  paymentUuid: string;

  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Payment gateway */
  gateway: string;

  /** Failure reason */
  reason: string;
}

/**
 * Payment refunded event payload
 * Emitted when payment is refunded (full or partial)
 */
export interface PaymentRefundedPayload {
  /** Payment UUID */
  paymentUuid: string;

  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Refund amount (decimal as string) */
  refundAmount: string;

  /** Refund reason */
  reason: string;

  /** Timestamp when refund was processed (ISO 8601) */
  refundedAt: string;
}

/**
 * Payment expired event payload
 * Emitted when payment timeout occurs (e.g., Comgate payment link expired)
 */
export interface PaymentExpiredPayload {
  /** Payment UUID */
  paymentUuid: string;

  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Expiration reason */
  reason: 'payment_timeout';
}

// Type aliases for CloudEvents
export type PaymentInitiatedEvent = CloudEvent<PaymentInitiatedPayload>;
export type PaymentCompletedEvent = CloudEvent<PaymentCompletedPayload>;
export type PaymentFailedEvent = CloudEvent<PaymentFailedPayload>;
export type PaymentRefundedEvent = CloudEvent<PaymentRefundedPayload>;
export type PaymentExpiredEvent = CloudEvent<PaymentExpiredPayload>;

/**
 * Create a payment initiated event
 */
export function createPaymentInitiatedEvent(data: PaymentInitiatedPayload): PaymentInitiatedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.initiated`, EVENT_SOURCE, data, data.paymentUuid);
}

/**
 * Create a payment completed event
 */
export function createPaymentCompletedEvent(data: PaymentCompletedPayload): PaymentCompletedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.completed`, EVENT_SOURCE, data, data.paymentUuid);
}

/**
 * Create a payment failed event
 */
export function createPaymentFailedEvent(data: PaymentFailedPayload): PaymentFailedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.failed`, EVENT_SOURCE, data, data.paymentUuid);
}

/**
 * Create a payment refunded event
 */
export function createPaymentRefundedEvent(data: PaymentRefundedPayload): PaymentRefundedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.refunded`, EVENT_SOURCE, data, data.paymentUuid);
}

/**
 * Create a payment expired event
 */
export function createPaymentExpiredEvent(data: PaymentExpiredPayload): PaymentExpiredEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.expired`, EVENT_SOURCE, data, data.paymentUuid);
}
