/**
 * CloudEvents v1.0 specification types
 * See: https://github.com/cloudevents/spec/blob/v1.0/spec.md
 */

/**
 * CloudEvent base type following CloudEvents v1.0 spec
 */
export interface CloudEvent<T = unknown> {
  /** CloudEvents version (always '1.0') */
  specversion: '1.0';

  /** Event type (e.g., 'com.schedulebox.booking.created') */
  type: string;

  /** Event source identifier (e.g., 'booking-service') */
  source: string;

  /** Unique event identifier (UUID) */
  id: string;

  /** Event timestamp in ISO 8601 format */
  time: string;

  /** Optional subject (entity UUID the event is about) */
  subject?: string;

  /** Content type of the data (always 'application/json' for ScheduleBox) */
  datacontenttype: string;

  /** Event payload data */
  data: T;
}

/**
 * ScheduleBox-specific event metadata
 * Used for tenant isolation and correlation tracking
 */
export interface EventMetadata {
  /** Tenant/company ID for multi-tenant isolation */
  companyId: number;

  /** User who triggered the event (if applicable) */
  userId?: number;

  /** Correlation ID for tracing related events across services */
  correlationId?: string;
}

/**
 * Domain event type combining CloudEvent with ScheduleBox metadata
 * All ScheduleBox events should use this type
 */
export type DomainEvent<T = unknown> = CloudEvent<T & EventMetadata>;
