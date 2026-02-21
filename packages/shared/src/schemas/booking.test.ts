import { describe, it, expect } from 'vitest';
import {
  bookingStatusEnum,
  bookingSourceEnum,
  bookingCreateSchema,
  bookingUpdateSchema,
  bookingCancelSchema,
  bookingRescheduleSchema,
  bookingListQuerySchema,
} from './booking';

// ============================================================================
// bookingStatusEnum
// ============================================================================

describe('bookingStatusEnum', () => {
  it('accepts valid status values', () => {
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    for (const status of validStatuses) {
      expect(bookingStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('rejects invalid status value', () => {
    expect(bookingStatusEnum.safeParse('invalid').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(bookingStatusEnum.safeParse('').success).toBe(false);
  });

  it('rejects null', () => {
    expect(bookingStatusEnum.safeParse(null).success).toBe(false);
  });
});

// ============================================================================
// bookingSourceEnum
// ============================================================================

describe('bookingSourceEnum', () => {
  it('accepts valid source values', () => {
    const validSources = [
      'online',
      'admin',
      'phone',
      'walk_in',
      'voice_ai',
      'marketplace',
      'api',
      'widget',
    ];
    for (const source of validSources) {
      expect(bookingSourceEnum.safeParse(source).success).toBe(true);
    }
  });

  it('rejects invalid source value', () => {
    expect(bookingSourceEnum.safeParse('web').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(bookingSourceEnum.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// bookingCreateSchema
// ============================================================================

describe('bookingCreateSchema', () => {
  const validCreate = {
    customer_id: 1,
    service_id: 2,
    start_time: '2026-02-20T10:00:00.000Z',
  };

  it('validates correct minimal data', () => {
    const result = bookingCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('applies default source of "online" when not provided', () => {
    const result = bookingCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe('online');
    }
  });

  it('accepts all optional fields', () => {
    const result = bookingCreateSchema.safeParse({
      ...validCreate,
      employee_id: 5,
      notes: 'Please be gentle',
      source: 'phone',
      coupon_code: 'SAVE10',
      gift_card_code: 'GC-ABC123',
      resource_ids: [1, 2, 3],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing customer_id', () => {
    const { customer_id: _, ...without } = validCreate;
    expect(bookingCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects missing service_id', () => {
    const { service_id: _, ...without } = validCreate;
    expect(bookingCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects missing start_time', () => {
    const { start_time: _, ...without } = validCreate;
    expect(bookingCreateSchema.safeParse(without).success).toBe(false);
  });

  it('rejects non-positive customer_id', () => {
    expect(bookingCreateSchema.safeParse({ ...validCreate, customer_id: 0 }).success).toBe(false);
    expect(bookingCreateSchema.safeParse({ ...validCreate, customer_id: -1 }).success).toBe(false);
  });

  it('rejects non-integer customer_id', () => {
    expect(bookingCreateSchema.safeParse({ ...validCreate, customer_id: 1.5 }).success).toBe(false);
  });

  it('rejects invalid datetime format for start_time', () => {
    expect(
      bookingCreateSchema.safeParse({ ...validCreate, start_time: '2026-02-20' }).success,
    ).toBe(false);
  });

  it('rejects invalid source enum value', () => {
    expect(bookingCreateSchema.safeParse({ ...validCreate, source: 'unknown' }).success).toBe(
      false,
    );
  });

  it('rejects notes exceeding 1000 characters', () => {
    expect(bookingCreateSchema.safeParse({ ...validCreate, notes: 'a'.repeat(1001) }).success).toBe(
      false,
    );
  });

  it('rejects empty object', () => {
    expect(bookingCreateSchema.safeParse({}).success).toBe(false);
  });
});

// ============================================================================
// bookingUpdateSchema
// ============================================================================

describe('bookingUpdateSchema', () => {
  it('validates empty update (all fields optional)', () => {
    expect(bookingUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('validates partial update with only status', () => {
    expect(bookingUpdateSchema.safeParse({ status: 'confirmed' }).success).toBe(true);
  });

  it('validates full update', () => {
    const result = bookingUpdateSchema.safeParse({
      employee_id: 3,
      start_time: '2026-03-01T14:00:00.000Z',
      notes: 'Updated notes',
      internal_notes: 'Internal only',
      status: 'confirmed',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status value', () => {
    expect(bookingUpdateSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('rejects invalid datetime in start_time', () => {
    expect(bookingUpdateSchema.safeParse({ start_time: 'not-a-date' }).success).toBe(false);
  });

  it('rejects internal_notes exceeding 2000 characters', () => {
    expect(bookingUpdateSchema.safeParse({ internal_notes: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('accepts valid status: cancelled', () => {
    expect(bookingUpdateSchema.safeParse({ status: 'cancelled' }).success).toBe(true);
  });
});

// ============================================================================
// bookingCancelSchema
// ============================================================================

describe('bookingCancelSchema', () => {
  it('validates empty cancel (reason is optional)', () => {
    expect(bookingCancelSchema.safeParse({}).success).toBe(true);
  });

  it('validates cancel with reason', () => {
    expect(bookingCancelSchema.safeParse({ reason: 'Changed my mind' }).success).toBe(true);
  });

  it('rejects reason exceeding 500 characters', () => {
    expect(bookingCancelSchema.safeParse({ reason: 'r'.repeat(501) }).success).toBe(false);
  });

  it('accepts reason at maximum length (500 chars)', () => {
    expect(bookingCancelSchema.safeParse({ reason: 'r'.repeat(500) }).success).toBe(true);
  });
});

// ============================================================================
// bookingRescheduleSchema
// ============================================================================

describe('bookingRescheduleSchema', () => {
  const validReschedule = {
    start_time: '2026-03-15T09:00:00.000Z',
  };

  it('validates correct reschedule data', () => {
    expect(bookingRescheduleSchema.safeParse(validReschedule).success).toBe(true);
  });

  it('validates reschedule with optional employee_id', () => {
    expect(bookingRescheduleSchema.safeParse({ ...validReschedule, employee_id: 7 }).success).toBe(
      true,
    );
  });

  it('rejects missing start_time', () => {
    expect(bookingRescheduleSchema.safeParse({}).success).toBe(false);
  });

  it('rejects invalid datetime format', () => {
    expect(bookingRescheduleSchema.safeParse({ start_time: '2026-03-15' }).success).toBe(false);
  });

  it('rejects non-positive employee_id', () => {
    expect(bookingRescheduleSchema.safeParse({ ...validReschedule, employee_id: 0 }).success).toBe(
      false,
    );
  });
});

// ============================================================================
// bookingListQuerySchema
// ============================================================================

describe('bookingListQuerySchema', () => {
  it('validates empty query (all defaults applied)', () => {
    const result = bookingListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string page and limit to numbers', () => {
    const result = bookingListQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('validates full query with all filters', () => {
    const result = bookingListQuerySchema.safeParse({
      page: '1',
      limit: '20',
      status: 'confirmed',
      customer_id: '10',
      employee_id: '5',
      service_id: '3',
      date_from: '2026-01-01',
      date_to: '2026-12-31',
      source: 'online',
    });
    expect(result.success).toBe(true);
  });

  it('rejects page below 1', () => {
    expect(bookingListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('rejects limit above 100', () => {
    expect(bookingListQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it('rejects invalid status enum', () => {
    expect(bookingListQuerySchema.safeParse({ status: 'unknown' }).success).toBe(false);
  });

  it('rejects invalid source enum', () => {
    expect(bookingListQuerySchema.safeParse({ source: 'fax' }).success).toBe(false);
  });
});
