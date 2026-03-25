/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for Payment SAGA Handlers
 *
 * Covers all 3 handlers:
 *   - handlePaymentCompleted
 *   - handlePaymentFailed
 *   - handlePaymentExpired
 *
 * Key invariants verified:
 *   - Happy path: state transition executed, event published
 *   - Idempotency: already-terminal bookings produce no DB update and no event
 *   - Booking not found: returns early without error
 *   - Unexpected status: returns early without error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handlePaymentCompleted,
  handlePaymentFailed,
  handlePaymentExpired,
} from './booking-payment-handlers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@schedulebox/database', () => ({
  dbTx: { transaction: vi.fn() },
  bookings: { id: 'id', uuid: 'uuid', status: 'status', companyId: 'companyId' },
  eq: vi.fn(),
}));

vi.mock('@schedulebox/events', () => ({
  publishEvent: vi.fn(),
  createBookingConfirmedEvent: vi.fn((p) => ({ type: 'booking.confirmed', data: p })),
  createBookingCancelledEvent: vi.fn((p) => ({ type: 'booking.cancelled', data: p })),
}));

// ---------------------------------------------------------------------------
// Import mocked modules
// ---------------------------------------------------------------------------

import { dbTx } from '@schedulebox/database';
import {
  publishEvent,
  createBookingConfirmedEvent,
  createBookingCancelledEvent,
} from '@schedulebox/events';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock tx that intercepts select() and update() chains.
 */
function makeMockTx(booking: Record<string, unknown> | null) {
  const rows = booking ? [booking] : [];

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  const mockTx = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue(updateChain),
    _updateChain: updateChain,
  };

  return mockTx;
}

// ---------------------------------------------------------------------------
// Shared payload factories
// ---------------------------------------------------------------------------

const completedPayload = {
  bookingUuid: 'booking-uuid-001',
  paymentUuid: 'payment-uuid-001',
} as any;

const failedPayload = {
  bookingUuid: 'booking-uuid-002',
  paymentUuid: 'payment-uuid-002',
  reason: 'Card declined',
} as any;

const expiredPayload = {
  bookingUuid: 'booking-uuid-003',
  paymentUuid: 'payment-uuid-003',
} as any;

// ---------------------------------------------------------------------------
// handlePaymentCompleted
// ---------------------------------------------------------------------------

describe('handlePaymentCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirms booking when status is pending', async () => {
    const pendingBooking = {
      id: 1,
      uuid: 'booking-uuid-001',
      status: 'pending',
      companyId: 10,
    };
    const mockTx = makeMockTx(pendingBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentCompleted(completedPayload);

    // update() should be called to set status = confirmed
    expect(mockTx.update).toHaveBeenCalledTimes(1);
    expect(mockTx._updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed' }),
    );

    // booking.confirmed event published
    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(createBookingConfirmedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingUuid: pendingBooking.uuid,
        companyId: pendingBooking.companyId,
      }),
    );
  });

  it('is idempotent: skips when booking already confirmed', async () => {
    const confirmedBooking = {
      id: 1,
      uuid: 'booking-uuid-001',
      status: 'confirmed',
      companyId: 10,
    };
    const mockTx = makeMockTx(confirmedBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentCompleted(completedPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('is idempotent: skips when booking already cancelled', async () => {
    const cancelledBooking = {
      id: 1,
      uuid: 'booking-uuid-001',
      status: 'cancelled',
      companyId: 10,
    };
    const mockTx = makeMockTx(cancelledBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentCompleted(completedPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('handles booking not found gracefully (returns early, no update, no event)', async () => {
    const mockTx = makeMockTx(null);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentCompleted(completedPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('skips when booking is in unexpected status (not pending/confirmed/cancelled)', async () => {
    const completedBooking = {
      id: 1,
      uuid: 'booking-uuid-001',
      status: 'completed',
      companyId: 10,
    };
    const mockTx = makeMockTx(completedBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentCompleted(completedPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('continues (does not throw) even if publishEvent throws', async () => {
    const pendingBooking = {
      id: 1,
      uuid: 'booking-uuid-001',
      status: 'pending',
      companyId: 10,
    };
    const mockTx = makeMockTx(pendingBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));
    vi.mocked(publishEvent).mockRejectedValueOnce(new Error('Event bus down'));

    await expect(handlePaymentCompleted(completedPayload)).resolves.toBeUndefined();
    // update was still called
    expect(mockTx.update).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// handlePaymentFailed
// ---------------------------------------------------------------------------

describe('handlePaymentFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels booking when status is pending', async () => {
    const pendingBooking = {
      id: 2,
      uuid: 'booking-uuid-002',
      status: 'pending',
      companyId: 10,
    };
    const mockTx = makeMockTx(pendingBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentFailed(failedPayload);

    expect(mockTx.update).toHaveBeenCalledTimes(1);
    expect(mockTx._updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled', cancelledBy: 'system' }),
    );

    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(createBookingCancelledEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingUuid: pendingBooking.uuid,
        cancelledBy: 'system',
        reason: failedPayload.reason,
      }),
    );
  });

  it('is idempotent: skips when booking already cancelled', async () => {
    const cancelledBooking = {
      id: 2,
      uuid: 'booking-uuid-002',
      status: 'cancelled',
      companyId: 10,
    };
    const mockTx = makeMockTx(cancelledBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentFailed(failedPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('is idempotent: skips when booking already confirmed (race condition)', async () => {
    const confirmedBooking = {
      id: 2,
      uuid: 'booking-uuid-002',
      status: 'confirmed',
      companyId: 10,
    };
    const mockTx = makeMockTx(confirmedBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentFailed(failedPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('handles booking not found gracefully', async () => {
    const mockTx = makeMockTx(null);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentFailed(failedPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('skips when booking is in unexpected status', async () => {
    const expiredBooking = {
      id: 2,
      uuid: 'booking-uuid-002',
      status: 'expired',
      companyId: 10,
    };
    const mockTx = makeMockTx(expiredBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentFailed(failedPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('re-throws if transaction itself throws', async () => {
    vi.mocked(dbTx.transaction).mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(handlePaymentFailed(failedPayload)).rejects.toThrow('DB connection lost');
  });
});

// ---------------------------------------------------------------------------
// handlePaymentExpired
// ---------------------------------------------------------------------------

describe('handlePaymentExpired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels booking with timeout reason when status is pending', async () => {
    const pendingBooking = {
      id: 3,
      uuid: 'booking-uuid-003',
      status: 'pending',
      companyId: 10,
    };
    const mockTx = makeMockTx(pendingBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentExpired(expiredPayload);

    expect(mockTx.update).toHaveBeenCalledTimes(1);
    expect(mockTx._updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        cancellationReason: 'Payment timeout (30 minutes)',
        cancelledBy: 'system',
      }),
    );

    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(createBookingCancelledEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingUuid: pendingBooking.uuid,
        cancelledBy: 'system',
        reason: 'Payment timeout (30 minutes)',
      }),
    );
  });

  it('is idempotent: skips when booking already cancelled', async () => {
    const cancelledBooking = {
      id: 3,
      uuid: 'booking-uuid-003',
      status: 'cancelled',
      companyId: 10,
    };
    const mockTx = makeMockTx(cancelledBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentExpired(expiredPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('is idempotent: skips when booking already confirmed (late race condition)', async () => {
    const confirmedBooking = {
      id: 3,
      uuid: 'booking-uuid-003',
      status: 'confirmed',
      companyId: 10,
    };
    const mockTx = makeMockTx(confirmedBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentExpired(expiredPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('handles booking not found gracefully', async () => {
    const mockTx = makeMockTx(null);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentExpired(expiredPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('skips when booking in unexpected status (no_show)', async () => {
    const noShowBooking = {
      id: 3,
      uuid: 'booking-uuid-003',
      status: 'no_show',
      companyId: 10,
    };
    const mockTx = makeMockTx(noShowBooking);

    vi.mocked(dbTx.transaction).mockImplementation(async (cb) => cb(mockTx as never));

    await handlePaymentExpired(expiredPayload);

    expect(mockTx.update).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('re-throws if transaction throws', async () => {
    vi.mocked(dbTx.transaction).mockRejectedValueOnce(new Error('Timeout'));

    await expect(handlePaymentExpired(expiredPayload)).rejects.toThrow('Timeout');
  });
});
