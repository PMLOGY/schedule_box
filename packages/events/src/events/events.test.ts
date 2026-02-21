/**
 * Tests for CloudEvent infrastructure and domain event creator functions.
 *
 * Tests focus on pure functions only (createCloudEvent, validateCloudEvent,
 * domain event creators). The publishEvent function is not tested here as it
 * requires a live RabbitMQ connection — that belongs in integration tests.
 */
import { describe, it, expect } from 'vitest';
import { createCloudEvent, validateCloudEvent } from '../publisher';
import {
  createBookingCreatedEvent,
  createBookingConfirmedEvent,
  createBookingCancelledEvent,
  createBookingCompletedEvent,
  createBookingNoShowEvent,
  createBookingRescheduledEvent,
} from './booking';
import {
  createPaymentInitiatedEvent,
  createPaymentCompletedEvent,
  createPaymentFailedEvent,
  createPaymentRefundedEvent,
  createPaymentExpiredEvent,
} from './payment';

// ============================================================================
// createCloudEvent — CloudEvents v1.0 envelope
// ============================================================================

describe('createCloudEvent', () => {
  it('creates a CloudEvent with required v1.0 fields', () => {
    const event = createCloudEvent('com.schedulebox.test.created', 'test-service', { foo: 'bar' });
    expect(event.specversion).toBe('1.0');
    expect(event.type).toBe('com.schedulebox.test.created');
    expect(event.source).toBe('test-service');
    expect(event.datacontenttype).toBe('application/json');
    expect(event.data).toEqual({ foo: 'bar' });
  });

  it('generates a unique UUID for each event id', () => {
    const e1 = createCloudEvent('com.schedulebox.test', 'svc', {});
    const e2 = createCloudEvent('com.schedulebox.test', 'svc', {});
    expect(e1.id).not.toBe(e2.id);
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(e1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('sets time as a valid ISO 8601 timestamp', () => {
    const event = createCloudEvent('com.schedulebox.test', 'svc', {});
    const parsed = new Date(event.time);
    expect(parsed).toBeInstanceOf(Date);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('includes optional subject when provided', () => {
    const event = createCloudEvent(
      'com.schedulebox.booking.created',
      'booking-service',
      { bookingUuid: 'abc-123' },
      'abc-123',
    );
    expect(event.subject).toBe('abc-123');
  });

  it('subject is undefined when not provided', () => {
    const event = createCloudEvent('com.schedulebox.test', 'svc', {});
    expect(event.subject).toBeUndefined();
  });

  it('preserves complex payload data', () => {
    const payload = { nested: { value: 42 }, array: [1, 2, 3], flag: true };
    const event = createCloudEvent('com.schedulebox.test', 'svc', payload);
    expect(event.data).toEqual(payload);
  });
});

// ============================================================================
// validateCloudEvent — envelope validation
// ============================================================================

describe('validateCloudEvent', () => {
  const validEvent = {
    specversion: '1.0' as const,
    type: 'com.schedulebox.booking.created',
    source: 'booking-service',
    id: '123e4567-e89b-12d3-a456-426614174000',
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: { companyId: 1, bookingUuid: 'abc' },
  };

  it('returns null for a valid CloudEvent', () => {
    expect(validateCloudEvent(validEvent)).toBeNull();
  });

  it('returns error string for wrong specversion', () => {
    const error = validateCloudEvent({ ...validEvent, specversion: '2.0' as '1.0' });
    expect(error).toBeTruthy();
    expect(typeof error).toBe('string');
  });

  it('returns error string for missing type', () => {
    const error = validateCloudEvent({ ...validEvent, type: '' });
    expect(error).toBeTruthy();
  });

  it('returns error string for missing source', () => {
    const error = validateCloudEvent({ ...validEvent, source: '' });
    expect(error).toBeTruthy();
  });

  it('returns error string for missing id', () => {
    const error = validateCloudEvent({ ...validEvent, id: '' });
    expect(error).toBeTruthy();
  });

  it('returns error string for missing time', () => {
    const error = validateCloudEvent({ ...validEvent, time: '' });
    expect(error).toBeTruthy();
  });

  it('returns error string for null data', () => {
    const error = validateCloudEvent({ ...validEvent, data: null as unknown as object });
    expect(error).toBeTruthy();
  });

  it('returns error string for null event itself', () => {
    const error = validateCloudEvent(null as unknown as typeof validEvent);
    expect(error).toBeTruthy();
  });
});

// ============================================================================
// Booking domain event creators
// ============================================================================

describe('createBookingCreatedEvent', () => {
  const payload = {
    bookingUuid: '550e8400-e29b-41d4-a716-446655440000',
    companyId: 1,
    customerUuid: 'cust-uuid-001',
    serviceUuid: 'svc-uuid-001',
    employeeUuid: null,
    startTime: '2026-03-01T10:00:00.000Z',
    endTime: '2026-03-01T11:00:00.000Z',
    status: 'pending' as const,
    source: 'online',
    price: '500.00',
    currency: 'CZK',
  };

  it('creates event with correct type prefix', () => {
    const event = createBookingCreatedEvent(payload);
    expect(event.type).toBe('com.schedulebox.booking.created');
  });

  it('sets source to booking-service', () => {
    const event = createBookingCreatedEvent(payload);
    expect(event.source).toBe('booking-service');
  });

  it('sets subject to bookingUuid', () => {
    const event = createBookingCreatedEvent(payload);
    expect(event.subject).toBe(payload.bookingUuid);
  });

  it('includes full payload in data', () => {
    const event = createBookingCreatedEvent(payload);
    expect(event.data).toEqual(payload);
    expect(event.data.companyId).toBe(1);
    expect(event.data.status).toBe('pending');
  });

  it('produces a valid CloudEvent (validateCloudEvent passes)', () => {
    const event = createBookingCreatedEvent(payload);
    expect(validateCloudEvent(event)).toBeNull();
  });
});

describe('createBookingConfirmedEvent', () => {
  const payload = {
    bookingUuid: '550e8400-e29b-41d4-a716-446655440001',
    companyId: 1,
    confirmedAt: new Date().toISOString(),
  };

  it('creates event with correct type', () => {
    expect(createBookingConfirmedEvent(payload).type).toBe('com.schedulebox.booking.confirmed');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createBookingConfirmedEvent(payload))).toBeNull();
  });
});

describe('createBookingCancelledEvent', () => {
  const payload = {
    bookingUuid: '550e8400-e29b-41d4-a716-446655440002',
    companyId: 1,
    cancelledBy: 'customer' as const,
    reason: 'Changed my mind',
    cancelledAt: new Date().toISOString(),
  };

  it('creates event with correct type', () => {
    expect(createBookingCancelledEvent(payload).type).toBe('com.schedulebox.booking.cancelled');
  });

  it('preserves cancelledBy and reason in data', () => {
    const event = createBookingCancelledEvent(payload);
    expect(event.data.cancelledBy).toBe('customer');
    expect(event.data.reason).toBe('Changed my mind');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createBookingCancelledEvent(payload))).toBeNull();
  });
});

describe('createBookingCompletedEvent', () => {
  const payload = {
    bookingUuid: '550e8400-e29b-41d4-a716-446655440003',
    companyId: 1,
    completedAt: new Date().toISOString(),
  };

  it('creates event with correct type', () => {
    expect(createBookingCompletedEvent(payload).type).toBe('com.schedulebox.booking.completed');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createBookingCompletedEvent(payload))).toBeNull();
  });
});

describe('createBookingNoShowEvent', () => {
  const payload = {
    bookingUuid: '550e8400-e29b-41d4-a716-446655440004',
    companyId: 1,
    markedAt: new Date().toISOString(),
  };

  it('creates event with correct type', () => {
    expect(createBookingNoShowEvent(payload).type).toBe('com.schedulebox.booking.no_show');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createBookingNoShowEvent(payload))).toBeNull();
  });
});

describe('createBookingRescheduledEvent', () => {
  const payload = {
    bookingUuid: '550e8400-e29b-41d4-a716-446655440005',
    companyId: 1,
    oldStartTime: '2026-03-01T10:00:00.000Z',
    oldEndTime: '2026-03-01T11:00:00.000Z',
    newStartTime: '2026-03-02T14:00:00.000Z',
    newEndTime: '2026-03-02T15:00:00.000Z',
    newEmployeeUuid: null,
  };

  it('creates event with correct type', () => {
    expect(createBookingRescheduledEvent(payload).type).toBe('com.schedulebox.booking.rescheduled');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createBookingRescheduledEvent(payload))).toBeNull();
  });
});

// ============================================================================
// Payment domain event creators
// ============================================================================

describe('createPaymentInitiatedEvent', () => {
  const payload = {
    paymentUuid: '660e8400-e29b-41d4-a716-446655440000',
    bookingUuid: '550e8400-e29b-41d4-a716-446655440000',
    companyId: 1,
    amount: '500.00',
    currency: 'CZK',
    gateway: 'comgate',
    gatewayTransactionId: null,
  };

  it('creates event with correct type', () => {
    expect(createPaymentInitiatedEvent(payload).type).toBe('com.schedulebox.payment.initiated');
  });

  it('sets subject to paymentUuid', () => {
    expect(createPaymentInitiatedEvent(payload).subject).toBe(payload.paymentUuid);
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createPaymentInitiatedEvent(payload))).toBeNull();
  });
});

describe('createPaymentCompletedEvent', () => {
  const payload = {
    paymentUuid: '660e8400-e29b-41d4-a716-446655440001',
    bookingUuid: '550e8400-e29b-41d4-a716-446655440000',
    companyId: 1,
    amount: '500.00',
    currency: 'CZK',
    gateway: 'comgate',
    completedAt: new Date().toISOString(),
  };

  it('creates event with correct type', () => {
    expect(createPaymentCompletedEvent(payload).type).toBe('com.schedulebox.payment.completed');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createPaymentCompletedEvent(payload))).toBeNull();
  });
});

describe('createPaymentFailedEvent', () => {
  const payload = {
    paymentUuid: '660e8400-e29b-41d4-a716-446655440002',
    bookingUuid: '550e8400-e29b-41d4-a716-446655440000',
    companyId: 1,
    gateway: 'comgate',
    reason: 'Insufficient funds',
    failedAt: new Date().toISOString(),
  };

  it('creates event with correct type', () => {
    expect(createPaymentFailedEvent(payload).type).toBe('com.schedulebox.payment.failed');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createPaymentFailedEvent(payload))).toBeNull();
  });
});

describe('createPaymentRefundedEvent', () => {
  const payload = {
    paymentUuid: '660e8400-e29b-41d4-a716-446655440003',
    bookingUuid: '550e8400-e29b-41d4-a716-446655440000',
    companyId: 1,
    amount: '250.00',
    currency: 'CZK',
    refundedAt: new Date().toISOString(),
  };

  it('creates event with correct type', () => {
    expect(createPaymentRefundedEvent(payload).type).toBe('com.schedulebox.payment.refunded');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createPaymentRefundedEvent(payload))).toBeNull();
  });
});

describe('createPaymentExpiredEvent', () => {
  const payload = {
    paymentUuid: '660e8400-e29b-41d4-a716-446655440004',
    bookingUuid: '550e8400-e29b-41d4-a716-446655440000',
    companyId: 1,
    reason: 'payment_timeout' as const,
  };

  it('creates event with correct type', () => {
    expect(createPaymentExpiredEvent(payload).type).toBe('com.schedulebox.payment.expired');
  });

  it('produces a valid CloudEvent', () => {
    expect(validateCloudEvent(createPaymentExpiredEvent(payload))).toBeNull();
  });
});
