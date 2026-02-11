/**
 * Review domain event definitions
 * CloudEvents for review lifecycle
 */

import { createCloudEvent } from '../publisher.js';
import type { CloudEvent } from '../types.js';

// Event type constants
const EVENT_SOURCE = 'review-service';
const EVENT_TYPE_PREFIX = 'com.schedulebox.review';

/**
 * Review created event payload
 * Emitted when a customer creates a review
 */
export interface ReviewCreatedPayload {
  /** Review UUID (public identifier) */
  reviewUuid: string;

  /** Company/tenant ID */
  companyId: number;

  /** Customer ID (internal SERIAL) */
  customerId: number;

  /** Booking ID (internal SERIAL) */
  bookingId: number;

  /** Rating (1-5) */
  rating: number;

  /** Timestamp when review was created (ISO 8601) */
  createdAt: string;
}

// Type alias for CloudEvent
export type ReviewCreatedEvent = CloudEvent<ReviewCreatedPayload>;

/**
 * Create a review created event
 */
export function createReviewCreatedEvent(data: ReviewCreatedPayload): ReviewCreatedEvent {
  return createCloudEvent(`${EVENT_TYPE_PREFIX}.created`, EVENT_SOURCE, data, data.reviewUuid);
}
