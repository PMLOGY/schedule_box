/**
 * Unit tests for Booking Status Transitions
 *
 * State machine under test:
 *   pending  -> confirmed  (confirmBooking)
 *   pending  -> cancelled  (cancelBooking)
 *   confirmed -> completed  (completeBooking)
 *   confirmed -> no_show    (markNoShow)
 *   pending/confirmed -> rescheduled (rescheduleBooking)
 *
 * Each function is tested for:
 *   1. Happy path: valid source state -> transition succeeds
 *   2. Invalid state: wrong source state -> throws ValidationError
 *   3. Booking not found -> throws NotFoundError
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  confirmBooking,
  cancelBooking,
  completeBooking,
  markNoShow,
  rescheduleBooking,
} from './booking-transitions';
import { NotFoundError, ValidationError } from '@schedulebox/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@schedulebox/database', () => ({
  db: {
    update: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
  },
  dbTx: {
    transaction: vi.fn(),
  },
  bookings: {},
  services: {},
  employees: {},
  employeeServices: {},
  notifications: {},
  customers: {},
  companies: {},
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
  lt: vi.fn(),
  gt: vi.fn(),
  ne: vi.fn(),
}));

vi.mock('@schedulebox/events', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  createBookingConfirmedEvent: vi.fn((p) => ({ type: 'booking.confirmed', data: p })),
  createBookingCancelledEvent: vi.fn((p) => ({ type: 'booking.cancelled', data: p })),
  createBookingCompletedEvent: vi.fn((p) => ({ type: 'booking.completed', data: p })),
  createBookingNoShowEvent: vi.fn((p) => ({ type: 'booking.no_show', data: p })),
  createBookingRescheduledEvent: vi.fn((p) => ({ type: 'booking.rescheduled', data: p })),
}));

vi.mock('./booking-service', () => ({
  getBooking: vi.fn(),
}));

vi.mock('@/lib/loyalty/points-engine', () => ({
  awardPointsForBooking: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/email/booking-emails', () => ({
  sendBookingStatusChangeEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Import mocked dependencies
// ---------------------------------------------------------------------------

import { db, dbTx } from '@schedulebox/database';
import { publishEvent } from '@schedulebox/events';
import { getBooking } from './booking-service';
import { awardPointsForBooking } from '@/lib/loyalty/points-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDbUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  return chain;
}

function makeBooking(
  overrides: Partial<{
    id: string;
    status: string;
    companyId: number | string;
    startTime: string;
    endTime: string;
  }> = {},
) {
  return {
    id: 'booking-uuid-001',
    companyId: 10,
    status: 'pending',
    startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
    endTime: new Date(Date.now() + 48 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    customer: { id: 'cust-1', name: 'Jan Novak', email: 'jan@test.cz', phone: null },
    service: { id: 'svc-1', name: 'Haircut', durationMinutes: 60, price: '500' },
    employee: { id: 'emp-1', name: 'Marie' },
    source: 'online' as const,
    notes: null,
    internalNotes: null,
    price: '500',
    currency: 'CZK',
    discountAmount: '0',
    noShowProbability: null,
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// confirmBooking
// ---------------------------------------------------------------------------

describe('confirmBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirms a pending booking', async () => {
    const booking = makeBooking({ status: 'pending' });
    const updatedBooking = makeBooking({ status: 'confirmed' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    const updateChain = makeDbUpdateChain();
    vi.mocked(db.update).mockReturnValue(updateChain as never);
    // db.select used in fireStatusChangeEmail — return empty to short-circuit
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const result = await confirmBooking(1, 10);

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('confirmed');
  });

  it('throws NotFoundError when booking does not exist', async () => {
    vi.mocked(getBooking).mockResolvedValueOnce(null as never);

    await expect(confirmBooking(999, 10)).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when booking is already cancelled', async () => {
    const booking = makeBooking({ status: 'cancelled' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(confirmBooking(1, 10)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when booking is completed', async () => {
    const booking = makeBooking({ status: 'completed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(confirmBooking(1, 10)).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// cancelBooking
// ---------------------------------------------------------------------------

describe('cancelBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels a pending booking (admin role — no policy check)', async () => {
    const booking = makeBooking({ status: 'pending' });
    const updatedBooking = makeBooking({ status: 'cancelled' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    const updateChain = makeDbUpdateChain();
    vi.mocked(db.update).mockReturnValue(updateChain as never);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const result = await cancelBooking(
      1,
      { reason: 'No longer needed' },
      { companyId: 10, userId: 1, userRole: 'admin' },
    );

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled', cancelledBy: 'admin' }),
    );
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('cancelled');
  });

  it('cancels a confirmed booking (employee role)', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    const updatedBooking = makeBooking({ status: 'cancelled' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    const updateChain = makeDbUpdateChain();
    vi.mocked(db.update).mockReturnValue(updateChain as never);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const result = await cancelBooking(
      1,
      { reason: 'Sick' },
      { companyId: 10, userId: 2, userRole: 'employee' },
    );

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled', cancelledBy: 'employee' }),
    );
    expect(result.status).toBe('cancelled');
  });

  it('throws AppError(CANCELLATION_POLICY) when customer cancels within policy window', async () => {
    // Booking starting in 1 hour (within 24h policy window)
    const booking = makeBooking({
      status: 'confirmed',
      startTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    });
    vi.mocked(getBooking).mockResolvedValue(booking as never);

    // Mock the select chain for booking data + service with policyHours=24
    vi.mocked(db.select)
      // First select: get booking data
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                serviceId: 1,
                startTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
              },
            ]),
          }),
        }),
      } as never)
      // Second select: get service policy
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ cancellationPolicyHours: 24 }]),
          }),
        }),
      } as never);

    await expect(
      cancelBooking(1, {}, { companyId: 10, userId: 3, userRole: 'customer' }),
    ).rejects.toMatchObject({ code: 'CANCELLATION_POLICY' });
  });

  it('throws NotFoundError when booking does not exist', async () => {
    vi.mocked(getBooking).mockResolvedValueOnce(null as never);

    await expect(
      cancelBooking(999, {}, { companyId: 10, userId: 1, userRole: 'admin' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when booking is already completed', async () => {
    const booking = makeBooking({ status: 'completed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(
      cancelBooking(1, {}, { companyId: 10, userId: 1, userRole: 'admin' }),
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// completeBooking
// ---------------------------------------------------------------------------

describe('completeBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes a confirmed booking', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    const updatedBooking = makeBooking({ status: 'completed' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    const updateChain = makeDbUpdateChain();
    vi.mocked(db.update).mockReturnValue(updateChain as never);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const result = await completeBooking(1, 10);

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(awardPointsForBooking).toHaveBeenCalledWith(booking.id, 10);
    expect(result.status).toBe('completed');
  });

  it('throws NotFoundError when booking does not exist', async () => {
    vi.mocked(getBooking).mockResolvedValueOnce(null as never);

    await expect(completeBooking(999, 10)).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when trying to complete a pending booking', async () => {
    const booking = makeBooking({ status: 'pending' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(completeBooking(1, 10)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when trying to complete a cancelled booking', async () => {
    const booking = makeBooking({ status: 'cancelled' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(completeBooking(1, 10)).rejects.toThrow(ValidationError);
  });

  it('does not fail if awardPointsForBooking throws (non-critical)', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    const updatedBooking = makeBooking({ status: 'completed' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    const updateChain = makeDbUpdateChain();
    vi.mocked(db.update).mockReturnValue(updateChain as never);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      }),
    } as never);

    vi.mocked(awardPointsForBooking).mockRejectedValueOnce(new Error('Points service down'));

    // Should not throw — loyalty points are non-critical
    await expect(completeBooking(1, 10)).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// markNoShow
// ---------------------------------------------------------------------------

describe('markNoShow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks a confirmed booking as no_show', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    const updatedBooking = makeBooking({ status: 'no_show' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    const updateChain = makeDbUpdateChain();
    vi.mocked(db.update).mockReturnValue(updateChain as never);

    const result = await markNoShow(1, 10);

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'no_show' }));
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('no_show');
  });

  it('throws NotFoundError when booking does not exist', async () => {
    vi.mocked(getBooking).mockResolvedValueOnce(null as never);

    await expect(markNoShow(999, 10)).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when booking is pending (not confirmed)', async () => {
    const booking = makeBooking({ status: 'pending' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(markNoShow(1, 10)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when booking is already cancelled', async () => {
    const booking = makeBooking({ status: 'cancelled' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(markNoShow(1, 10)).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// rescheduleBooking
// ---------------------------------------------------------------------------

describe('rescheduleBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reschedules a confirmed booking to a new time slot', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    const updatedBooking = makeBooking({
      status: 'confirmed',
      startTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    // dbTx.transaction mock: call through
    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };

      // Need different returns for each select call in the function
      let callCount = 0;
      mockTx.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // booking data
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
              }),
            }),
          };
        }
        if (callCount === 2) {
          // service data
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi
                  .fn()
                  .mockResolvedValue([
                    { durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
                  ]),
              }),
            }),
          };
        }
        if (callCount === 3) {
          // employee lock (SELECT FOR UPDATE)
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                for: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
        // conflict check
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // no conflicts
            }),
          }),
        };
      });

      return cb(mockTx as never);
    });

    // db.select for event publishing after tx
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ employeeId: 5 }]),
        }),
      }),
    } as never);

    const newTime = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const result = await rescheduleBooking(
      1,
      { start_time: newTime },
      { companyId: 10, userId: 1 },
    );

    expect(dbTx.transaction).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('throws NotFoundError when booking does not exist', async () => {
    vi.mocked(getBooking).mockResolvedValueOnce(null as never);

    await expect(
      rescheduleBooking(
        999,
        { start_time: new Date().toISOString() },
        { companyId: 10, userId: 1 },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when booking is cancelled (cannot reschedule)', async () => {
    const booking = makeBooking({ status: 'cancelled' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(
      rescheduleBooking(1, { start_time: new Date().toISOString() }, { companyId: 10, userId: 1 }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when booking is completed (cannot reschedule)', async () => {
    const booking = makeBooking({ status: 'completed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(
      rescheduleBooking(1, { start_time: new Date().toISOString() }, { companyId: 10, userId: 1 }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when booking is no_show (cannot reschedule)', async () => {
    const booking = makeBooking({ status: 'no_show' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    await expect(
      rescheduleBooking(1, { start_time: new Date().toISOString() }, { companyId: 10, userId: 1 }),
    ).rejects.toThrow(ValidationError);
  });

  it('reschedules a pending booking to a new time slot', async () => {
    const booking = makeBooking({ status: 'pending' });
    const updatedBooking = makeBooking({ status: 'pending' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      let callCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
                }),
              }),
            };
          }
          if (callCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi
                    .fn()
                    .mockResolvedValue([
                      { durationMinutes: 30, bufferBeforeMinutes: 5, bufferAfterMinutes: 5 },
                    ]),
                }),
              }),
            };
          }
          if (callCount === 3) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  for: vi.fn().mockResolvedValue([]),
                }),
              }),
            };
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };
      return cb(mockTx as never);
    });

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ employeeId: 5 }]),
        }),
      }),
    } as never);

    const newTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const result = await rescheduleBooking(
      1,
      { start_time: newTime },
      { companyId: 10, userId: 1 },
    );

    expect(dbTx.transaction).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('reschedules with a different employee (validates employee assignment)', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    const updatedBooking = makeBooking({ status: 'confirmed' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      let callCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // booking data — original employee 5
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
                }),
              }),
            };
          }
          if (callCount === 2) {
            // new employee exists and is active
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi
                    .fn()
                    .mockResolvedValue([
                      { id: 7, uuid: 'emp-uuid-7', companyId: 10, isActive: true },
                    ]),
                }),
              }),
            };
          }
          if (callCount === 3) {
            // employee-service assignment exists
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ employeeId: 7 }]),
                }),
              }),
            };
          }
          if (callCount === 4) {
            // service duration
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi
                    .fn()
                    .mockResolvedValue([
                      { durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
                    ]),
                }),
              }),
            };
          }
          if (callCount === 5) {
            // employee lock
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  for: vi.fn().mockResolvedValue([]),
                }),
              }),
            };
          }
          // no conflicts
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };
      return cb(mockTx as never);
    });

    // For event publishing after transaction
    vi.mocked(db.select)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ employeeId: 7 }]),
          }),
        }),
      } as never)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ uuid: 'emp-uuid-7' }]),
          }),
        }),
      } as never);

    const newTime = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const result = await rescheduleBooking(
      1,
      { start_time: newTime, employee_id: 7 },
      { companyId: 10, userId: 1 },
    );

    expect(dbTx.transaction).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('throws NotFoundError when new employee does not exist', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      let callCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
                }),
              }),
            };
          }
          // Employee not found
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }),
        update: vi.fn(),
      };
      return cb(mockTx as never);
    });

    await expect(
      rescheduleBooking(
        1,
        { start_time: new Date().toISOString(), employee_id: 99 },
        {
          companyId: 10,
          userId: 1,
        },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when new employee is inactive', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      let callCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
                }),
              }),
            };
          }
          // Employee exists but inactive
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi
                  .fn()
                  .mockResolvedValue([
                    { id: 8, uuid: 'emp-uuid-8', companyId: 10, isActive: false },
                  ]),
              }),
            }),
          };
        }),
        update: vi.fn(),
      };
      return cb(mockTx as never);
    });

    await expect(
      rescheduleBooking(
        1,
        { start_time: new Date().toISOString(), employee_id: 8 },
        {
          companyId: 10,
          userId: 1,
        },
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when employee is not assigned to service', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      let callCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // booking data — original employee 5
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
                }),
              }),
            };
          }
          if (callCount === 2) {
            // employee active
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi
                    .fn()
                    .mockResolvedValue([
                      { id: 9, uuid: 'emp-uuid-9', companyId: 10, isActive: true },
                    ]),
                }),
              }),
            };
          }
          // no assignment
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }),
        update: vi.fn(),
      };
      return cb(mockTx as never);
    });

    await expect(
      rescheduleBooking(
        1,
        { start_time: new Date().toISOString(), employee_id: 9 },
        {
          companyId: 10,
          userId: 1,
        },
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when no employee is available (null employeeId)', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                // booking has no employee set
                { id: 1, employeeId: null, serviceId: 1 },
              ]),
            }),
          }),
        }),
        update: vi.fn(),
      };
      return cb(mockTx as never);
    });

    // No employee_id in input, booking has no employee — should throw
    await expect(
      rescheduleBooking(
        1,
        { start_time: new Date().toISOString() },
        {
          companyId: 10,
          userId: 1,
        },
      ),
    ).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when booking data not found inside transaction', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      const mockTx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // booking not found inside tx
            }),
          }),
        }),
        update: vi.fn(),
      };
      return cb(mockTx as never);
    });

    await expect(
      rescheduleBooking(
        1,
        { start_time: new Date().toISOString() },
        {
          companyId: 10,
          userId: 1,
        },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('does not throw when publishEvent fails after reschedule (fire-and-forget)', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    const updatedBooking = makeBooking({ status: 'confirmed' });

    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);
    vi.mocked(getBooking).mockResolvedValueOnce(updatedBooking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      let callCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
                }),
              }),
            };
          }
          if (callCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi
                    .fn()
                    .mockResolvedValue([
                      { durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
                    ]),
                }),
              }),
            };
          }
          if (callCount === 3) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  for: vi.fn().mockResolvedValue([]),
                }),
              }),
            };
          }
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
      };
      return cb(mockTx as never);
    });

    // db.select for event publishing
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ employeeId: 5 }]),
        }),
      }),
    } as never);

    // publishEvent fails
    vi.mocked(publishEvent).mockRejectedValueOnce(new Error('Event bus down'));

    // Should not throw despite event failure
    await expect(
      rescheduleBooking(
        1,
        { start_time: new Date().toISOString() },
        {
          companyId: 10,
          userId: 1,
        },
      ),
    ).resolves.toBeDefined();
  });

  it('throws NotFoundError when service not found inside transaction', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      let callCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
                }),
              }),
            };
          }
          // Service not found
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }),
        update: vi.fn(),
      };
      return cb(mockTx as never);
    });

    await expect(
      rescheduleBooking(
        1,
        { start_time: new Date().toISOString() },
        {
          companyId: 10,
          userId: 1,
        },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws AppError(SLOT_TAKEN) when new time slot has conflicting booking', async () => {
    const booking = makeBooking({ status: 'confirmed' });
    vi.mocked(getBooking).mockResolvedValueOnce(booking as never);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => {
      let callCount = 0;
      const mockTx = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: 1, employeeId: 5, serviceId: 1 }]),
                }),
              }),
            };
          }
          if (callCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi
                    .fn()
                    .mockResolvedValue([
                      { durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
                    ]),
                }),
              }),
            };
          }
          if (callCount === 3) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  for: vi.fn().mockResolvedValue([]),
                }),
              }),
            };
          }
          // Conflict found
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: 99 }]),
              }),
            }),
          };
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };
      return cb(mockTx as never);
    });

    await expect(
      rescheduleBooking(1, { start_time: new Date().toISOString() }, { companyId: 10, userId: 1 }),
    ).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
  });
});
