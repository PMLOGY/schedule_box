/**
 * Unit tests for booking-service.ts
 *
 * Tests: createBooking (double-booking prevention, SLOT_TAKEN, happy path),
 *        listBookings (pagination, filters), getBooking, updateBooking, deleteBooking.
 *
 * All DB calls mocked. drizzle-orm operators mocked entirely.
 * publishEvent and sendBookingConfirmationEmail mocked (fire-and-forget).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before any imports that touch the mocked modules
// ---------------------------------------------------------------------------

vi.mock('@schedulebox/database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  dbTx: {
    transaction: vi.fn(),
  },
  bookings: { id: 'bookings.id', uuid: 'bookings.uuid', companyId: 'bookings.companyId' },
  bookingResources: {},
  services: {},
  employees: {},
  employeeServices: {},
  customers: {},
  notifications: {},
  companies: {},
}));

vi.mock('@schedulebox/events', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  createBookingCreatedEvent: vi.fn().mockReturnValue({ type: 'booking.created' }),
}));

vi.mock('@/lib/email/booking-emails', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args) => ({ op: 'eq', args })),
  and: vi.fn((...args) => ({ op: 'and', args })),
  or: vi.fn((...args) => ({ op: 'or', args })),
  isNull: vi.fn((col) => ({ op: 'isNull', col })),
  gte: vi.fn((...args) => ({ op: 'gte', args })),
  lt: vi.fn((...args) => ({ op: 'lt', args })),
  gt: vi.fn((...args) => ({ op: 'gt', args })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({
    op: 'sql',
    strings,
    values,
  })),
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks are registered
// ---------------------------------------------------------------------------
import {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
} from './booking-service';
import { db, dbTx } from '@schedulebox/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fluent select chain that returns `rows` on awaiting. */
function makeSelectChain(rows: any[]) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    for: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  // make it awaitable (for SELECT without explicit orderBy/offset)
  chain.then = (resolve: (v: any[]) => void) => resolve(rows);
  // override limit to return awaitable
  chain.limit = vi.fn().mockReturnValue({
    ...chain,
    then: (resolve: (v: any[]) => void) => resolve(rows),
  });
  return chain;
}

/** Build a fluent insert chain that returns `rows` on awaiting. */
function makeInsertChain(rows: any[]) {
  const chain: any = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(rows),
    then: (resolve: (v: any[]) => void) => resolve(rows),
  };
  return chain;
}

/** Build a fluent update chain. */
function makeUpdateChain() {
  const chain: any = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  return chain;
}

/** A minimal service row returned by DB selects. */
const MOCK_SERVICE = {
  id: 10,
  uuid: 'svc-uuid-1',
  companyId: 1,
  name: 'Haircut',
  durationMinutes: 60,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  price: '500',
  currency: 'CZK',
  isActive: true,
};

/** A minimal employee row. */
const MOCK_EMPLOYEE = {
  id: 5,
  uuid: 'emp-uuid-1',
  companyId: 1,
  name: 'Alice',
  isActive: true,
};

/** A minimal inserted booking row. */
const MOCK_INSERTED_BOOKING = {
  id: 42,
  uuid: 'bkg-uuid-1',
  companyId: 1,
  customerId: 20,
  serviceId: 10,
  employeeId: 5,
  startTime: new Date('2026-04-10T09:00:00Z'),
  endTime: new Date('2026-04-10T10:00:00Z'),
  status: 'pending' as const,
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
  createdAt: new Date(),
  updatedAt: new Date(),
  bookingMetadata: null,
  // Extra fields returned by transaction context
  employeeUuid: 'emp-uuid-1',
  employeeName: 'Alice',
  serviceUuid: 'svc-uuid-1',
  serviceName: 'Haircut',
  serviceDuration: 60,
};

/** A minimal booking row returned by getBooking SELECT. */
const MOCK_BOOKING_ROW = {
  id: 'bkg-uuid-1',
  companyId: 1,
  startTime: new Date('2026-04-10T09:00:00Z'),
  endTime: new Date('2026-04-10T10:00:00Z'),
  status: 'pending' as const,
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
  createdAt: new Date(),
  updatedAt: new Date(),
  bookingMetadata: null,
  customerUuid: 'cust-uuid-1',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: null,
  serviceUuid: 'svc-uuid-1',
  serviceName: 'Haircut',
  serviceDurationMinutes: 60,
  servicePrice: '500',
  employeeUuid: 'emp-uuid-1',
  employeeName: 'Alice',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('booking-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // createBooking
  // -------------------------------------------------------------------------

  describe('createBooking', () => {
    const input = {
      service_id: 10,
      customer_id: 20,
      employee_id: 5,
      start_time: '2026-04-10T09:00:00Z',
      notes: undefined,
      source: 'online' as const,
      resource_ids: undefined,
    };

    const context = { companyId: 1, userId: 99 };

    it('creates a booking successfully (happy path)', async () => {
      // Transaction mock: invokes callback with a tx object
      (dbTx.transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          select: vi
            .fn()
            // call 1: service lookup
            .mockReturnValueOnce(makeSelectChain([MOCK_SERVICE]))
            // call 2: employee validation
            .mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE]))
            // call 3: employee-service assignment
            .mockReturnValueOnce(makeSelectChain([{ employeeId: 5 }]))
            // call 4: SELECT FOR UPDATE lock
            .mockReturnValueOnce(makeSelectChain([{ id: 5 }]))
            // call 5: conflict check — empty (no conflict)
            .mockReturnValueOnce(makeSelectChain([])),
          insert: vi
            .fn()
            // booking insert
            .mockReturnValueOnce(makeInsertChain([MOCK_INSERTED_BOOKING])),
        };
        return cb(tx);
      });

      // getBooking (called after transaction) — db.select chain
      (db.select as any)
        .mockReturnValueOnce(makeSelectChain([MOCK_BOOKING_ROW]))
        // fireBookingCreatedNotifications internal select (fire-and-forget, resolves async)
        .mockReturnValue(makeSelectChain([]));

      const result = await createBooking(input, context);

      expect(result).toMatchObject({
        id: 'bkg-uuid-1',
        customer: expect.objectContaining({ name: 'John Doe' }),
        service: expect.objectContaining({ name: 'Haircut' }),
        employee: expect.objectContaining({ name: 'Alice' }),
        status: 'pending',
      });
      expect(dbTx.transaction).toHaveBeenCalledTimes(1);
    });

    it('throws SLOT_TAKEN when conflicting booking exists', async () => {
      (dbTx.transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          select: vi
            .fn()
            // call 1: service lookup
            .mockReturnValueOnce(makeSelectChain([MOCK_SERVICE]))
            // call 2: employee validation
            .mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE]))
            // call 3: employee-service assignment
            .mockReturnValueOnce(makeSelectChain([{ employeeId: 5 }]))
            // call 4: SELECT FOR UPDATE lock
            .mockReturnValueOnce(makeSelectChain([{ id: 5 }]))
            // call 5: conflict check — CONFLICT FOUND
            .mockReturnValueOnce(makeSelectChain([{ id: 999 }])),
          insert: vi.fn(),
        };
        return cb(tx);
      });

      await expect(createBooking(input, context)).rejects.toMatchObject({
        code: 'SLOT_TAKEN',
        statusCode: 409,
      });

      expect(dbTx.transaction).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundError when service does not exist', async () => {
      (dbTx.transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          select: vi
            .fn()
            // service lookup — not found
            .mockReturnValueOnce(makeSelectChain([])),
          insert: vi.fn(),
        };
        return cb(tx);
      });

      await expect(createBooking(input, context)).rejects.toThrow('Service not found');
    });

    it('throws ValidationError when service is inactive', async () => {
      (dbTx.transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          select: vi
            .fn()
            .mockReturnValueOnce(makeSelectChain([{ ...MOCK_SERVICE, isActive: false }])),
          insert: vi.fn(),
        };
        return cb(tx);
      });

      await expect(createBooking(input, context)).rejects.toThrow('Service is not active');
    });

    it('auto-assigns employee when employee_id not provided', async () => {
      const inputNoEmployee = { ...input, employee_id: undefined, notes: undefined };

      (dbTx.transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          select: vi
            .fn()
            // call 1: service
            .mockReturnValueOnce(makeSelectChain([MOCK_SERVICE]))
            // call 2: auto-assign employees list
            .mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE]))
            // call 3: SELECT FOR UPDATE
            .mockReturnValueOnce(makeSelectChain([{ id: 5 }]))
            // call 4: conflict check — empty
            .mockReturnValueOnce(makeSelectChain([])),
          insert: vi.fn().mockReturnValueOnce(makeInsertChain([MOCK_INSERTED_BOOKING])),
        };
        return cb(tx);
      });

      (db.select as any)
        .mockReturnValueOnce(makeSelectChain([MOCK_BOOKING_ROW]))
        .mockReturnValue(makeSelectChain([]));

      const result = await createBooking(inputNoEmployee, context);
      expect(result.employee?.name).toBe('Alice');
    });
  });

  // -------------------------------------------------------------------------
  // listBookings
  // -------------------------------------------------------------------------

  describe('listBookings', () => {
    it('returns paginated results with correct meta', async () => {
      const rows = [MOCK_BOOKING_ROW];

      // First db.select call: data query (with orderBy)
      const dataChain: any = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(rows),
      };

      // Second db.select call: count query
      const countChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };

      (db.select as any).mockReturnValueOnce(dataChain).mockReturnValueOnce(countChain);

      const result = await listBookings({ page: 1, limit: 20 }, 1);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      });
    });

    it('applies status filter', async () => {
      const dataChain: any = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };
      const countChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };

      (db.select as any).mockReturnValueOnce(dataChain).mockReturnValueOnce(countChain);

      const result = await listBookings({ status: 'confirmed', page: 1, limit: 20 }, 1);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('applies date range filter', async () => {
      const dataChain: any = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([MOCK_BOOKING_ROW]),
      };
      const countChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };

      (db.select as any).mockReturnValueOnce(dataChain).mockReturnValueOnce(countChain);

      const result = await listBookings(
        { date_from: '2026-04-01', date_to: '2026-04-30', page: 1, limit: 20 },
        1,
      );

      expect(result.data).toHaveLength(1);
    });

    it('applies employee_id filter', async () => {
      const dataChain: any = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([]),
      };
      const countChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };

      (db.select as any).mockReturnValueOnce(dataChain).mockReturnValueOnce(countChain);

      await listBookings({ employee_id: 5, page: 1, limit: 20 }, 1);

      // Both select chains should have been called
      expect(db.select).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // getBooking
  // -------------------------------------------------------------------------

  describe('getBooking', () => {
    it('returns booking with relations when found', async () => {
      (db.select as any).mockReturnValueOnce(makeSelectChain([MOCK_BOOKING_ROW]));

      const result = await getBooking(42, 1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('bkg-uuid-1');
      expect(result?.customer.name).toBe('John Doe');
      expect(result?.employee?.name).toBe('Alice');
    });

    it('returns null when booking not found', async () => {
      (db.select as any).mockReturnValueOnce(makeSelectChain([]));

      const result = await getBooking(999, 1);

      expect(result).toBeNull();
    });

    it('returns null for employee when employeeUuid is null', async () => {
      const rowNoEmployee = {
        ...MOCK_BOOKING_ROW,
        employeeUuid: null,
        employeeName: null,
      };
      (db.select as any).mockReturnValueOnce(makeSelectChain([rowNoEmployee]));

      const result = await getBooking(42, 1);

      expect(result?.employee).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateBooking
  // -------------------------------------------------------------------------

  describe('updateBooking', () => {
    it('updates booking fields without time change', async () => {
      // getBooking (call 1) — existing booking found
      (db.select as any)
        .mockReturnValueOnce(makeSelectChain([MOCK_BOOKING_ROW]))
        // db.update chain
        .mockReturnValueOnce(makeSelectChain([{ id: 42 }]))
        // second getBooking call (to return updated booking)
        .mockReturnValueOnce(makeSelectChain([MOCK_BOOKING_ROW]));

      (db.update as any).mockReturnValue(makeUpdateChain());

      const result = await updateBooking(42, { status: 'confirmed', notes: 'Updated' }, 1);

      expect(result).not.toBeNull();
      expect(db.update).toHaveBeenCalled();
    });

    it('throws NotFoundError when booking does not exist for update', async () => {
      // getBooking returns null
      (db.select as any).mockReturnValueOnce(makeSelectChain([]));

      await expect(updateBooking(999, { status: 'confirmed' }, 1)).rejects.toThrow(
        'Booking not found',
      );
    });

    it('uses transaction when start_time is provided', async () => {
      // getBooking (first call outside transaction)
      (db.select as any).mockReturnValueOnce(makeSelectChain([MOCK_BOOKING_ROW]));

      (dbTx.transaction as any).mockImplementation(async (cb: any) => {
        const tx = {
          select: vi
            .fn()
            // booking internal data
            .mockReturnValueOnce(makeSelectChain([{ id: 42, employeeId: 5, serviceId: 10 }]))
            // service data
            .mockReturnValueOnce(
              makeSelectChain([
                { durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
              ]),
            )
            // SELECT FOR UPDATE lock
            .mockReturnValueOnce(makeSelectChain([{ id: 5 }]))
            // conflict check — empty
            .mockReturnValueOnce(makeSelectChain([])),
          update: vi.fn().mockReturnValue(makeUpdateChain()),
        };
        return cb(tx);
      });

      // db.select calls after transaction: uuid lookup + second getBooking
      (db.select as any)
        .mockReturnValueOnce(makeSelectChain([{ id: 42 }]))
        .mockReturnValueOnce(makeSelectChain([MOCK_BOOKING_ROW]));

      const result = await updateBooking(42, { start_time: '2026-04-10T10:00:00Z' }, 1);

      expect(result).not.toBeNull();
      expect(dbTx.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // deleteBooking
  // -------------------------------------------------------------------------

  describe('deleteBooking', () => {
    it('soft-deletes booking by setting deletedAt', async () => {
      // existence check
      (db.select as any).mockReturnValueOnce(makeSelectChain([{ id: 42 }]));
      (db.update as any).mockReturnValue(makeUpdateChain());

      await expect(deleteBooking(42, 1)).resolves.toBeUndefined();

      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundError for non-existent booking', async () => {
      (db.select as any).mockReturnValueOnce(makeSelectChain([]));

      await expect(deleteBooking(999, 1)).rejects.toThrow('Booking not found');

      expect(db.update).not.toHaveBeenCalled();
    });
  });
});
