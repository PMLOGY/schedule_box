/**
 * Booking domain event definitions
 * CloudEvents for booking lifecycle state changes
 */

import { createCloudEvent } from '../publisher';
import type { CloudEvent } from '../types';

// Event type constants
const EVENT_SOURCE = 'booking-service';
const EVENT_TYPE_PREFIX = 'com.schedulebox.booking';

/**
 * Booking created event payload
 * Emitted when a new booking is created (status: pending)
 */
export interface BookingCreatedPayload {
  /** Booking UUID (public identifier) */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Customer UUID */
  customerUuid: string;

  /** Service UUID */
  serviceUuid: string;

  /** Employee UUID (null if any employee can fulfill) */
  employeeUuid: string | null;

  /** Booking start time (ISO 8601) */
  startTime: string;

  /** Booking end time (ISO 8601) */
  endTime: string;

  /** Booking status (always 'pending' on creation) */
  status: 'pending';

  /** Booking source (e.g., 'web', 'mobile', 'admin', 'api') */
  source: string;

  /** Booking price (decimal as string) */
  price: string;

  /** Currency code (e.g., 'CZK', 'EUR') */
  currency: string;
}

/**
 * Booking confirmed event payload
 * Emitted when booking transitions from pending to confirmed
 */
export interface BookingConfirmedPayload {
  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Timestamp when booking was confirmed (ISO 8601) */
  confirmedAt: string;
}

/**
 * Booking cancelled event payload
 * Emitted when booking is cancelled by any actor
 */
export interface BookingCancelledPayload {
  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Who cancelled the booking */
  cancelledBy: 'customer' | 'employee' | 'admin' | 'system';

  /** Cancellation reason (optional) */
  reason: string | null;

  /** Timestamp when booking was cancelled (ISO 8601) */
  cancelledAt: string;
}

/**
 * Booking completed event payload
 * Emitted when service is successfully completed
 */
export interface BookingCompletedPayload {
  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Timestamp when booking was completed (ISO 8601) */
  completedAt: string;
}

/**
 * Booking no-show event payload
 * Emitted when customer doesn't show up for booking
 */
export interface BookingNoShowPayload {
  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Timestamp when no-show was marked (ISO 8601) */
  markedAt: string;
}

/**
 * Booking rescheduled event payload
 * Emitted when booking time or employee is changed
 */
export interface BookingRescheduledPayload {
  /** Booking UUID */
  bookingUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Original start time (ISO 8601) */
  oldStartTime: string;

  /** Original end time (ISO 8601) */
  oldEndTime: string;

  /** New start time (ISO 8601) */
  newStartTime: string;

  /** New end time (ISO 8601) */
  newEndTime: string;

  /** New employee UUID (null if unchanged or any employee) */
  newEmployeeUuid: string | null;
}

// Type aliases for CloudEvents
export type BookingCreatedEvent = CloudEvent<BookingCreatedPayload>;
export type BookingConfirmedEvent = CloudEvent<BookingConfirmedPayload>;
export type BookingCancelledEvent = CloudEvent<BookingCancelledPayload>;
export type BookingCompletedEvent = CloudEvent<BookingCompletedPayload>;
export type BookingNoShowEvent = CloudEvent<BookingNoShowPayload>;
export type BookingRescheduledEvent = CloudEvent<BookingRescheduledPayload>;

/**
 * Create a booking created event
 */
export function createBookingCreatedEvent(data: BookingCreatedPayload): BookingCreatedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.created`, EVENT_SOURCE, data, data.bookingUuid);
}

/**
 * Create a booking confirmed event
 */
export function createBookingConfirmedEvent(data: BookingConfirmedPayload): BookingConfirmedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.confirmed`, EVENT_SOURCE, data, data.bookingUuid);
}

/**
 * Create a booking cancelled event
 */
export function createBookingCancelledEvent(data: BookingCancelledPayload): BookingCancelledEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.cancelled`, EVENT_SOURCE, data, data.bookingUuid);
}

/**
 * Create a booking completed event
 */
export function createBookingCompletedEvent(data: BookingCompletedPayload): BookingCompletedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.completed`, EVENT_SOURCE, data, data.bookingUuid);
}

/**
 * Create a booking no-show event
 */
export function createBookingNoShowEvent(data: BookingNoShowPayload): BookingNoShowEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.no_show`, EVENT_SOURCE, data, data.bookingUuid);
}

/**
 * Create a booking rescheduled event
 */
export function createBookingRescheduledEvent(
  data: BookingRescheduledPayload,
): BookingRescheduledEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.rescheduled`, EVENT_SOURCE, data, data.bookingUuid);
}
