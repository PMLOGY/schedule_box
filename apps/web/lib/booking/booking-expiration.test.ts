/**
 * Unit tests for Booking Expiration Service
 *
 * expirePendingBookings() marks pending bookings older than 30 minutes as cancelled
 * and publishes a booking.cancelled event for each one.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { expirePendingBookings } from './booking-expiration';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@schedulebox/database', () => ({
  db: {
    update: vi.fn(),
  },
  bookings: {},
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('@schedulebox/events', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
  createBookingCancelledEvent: vi.fn((p) => ({ type: 'booking.cancelled', data: p })),
}));

// ---------------------------------------------------------------------------
// Import mocked dependencies
// ---------------------------------------------------------------------------

import { db } from '@schedulebox/database';
import { publishEvent, createBookingCancelledEvent } from '@schedulebox/events';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('expirePendingBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the count of expired bookings and publishes one event per booking', async () => {
    const expiredRows = [
      { id: 1, uuid: 'booking-uuid-101', companyId: 10 },
      { id: 2, uuid: 'booking-uuid-102', companyId: 10 },
      { id: 3, uuid: 'booking-uuid-103', companyId: 20 },
    ];

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(expiredRows),
        }),
      }),
    } as never);

    const count = await expirePendingBookings();

    expect(count).toBe(3);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledTimes(3);

    expect(createBookingCancelledEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingUuid: 'booking-uuid-101',
        cancelledBy: 'system',
        reason: 'Booking expired (unpaid after 30 minutes)',
      }),
    );
    expect(createBookingCancelledEvent).toHaveBeenCalledWith(
      expect.objectContaining({ bookingUuid: 'booking-uuid-102' }),
    );
    expect(createBookingCancelledEvent).toHaveBeenCalledWith(
      expect.objectContaining({ bookingUuid: 'booking-uuid-103' }),
    );
  });

  it('returns 0 and publishes no events when no pending bookings are found', async () => {
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never);

    const count = await expirePendingBookings();

    expect(count).toBe(0);
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('sets the correct fields on expired bookings (system cancel + reason)', async () => {
    const expiredRows = [{ id: 1, uuid: 'booking-uuid-104', companyId: 10 }];

    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(expiredRows),
      }),
    });

    vi.mocked(db.update).mockReturnValue({ set: setMock } as never);

    await expirePendingBookings();

    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        cancelledBy: 'system',
        cancellationReason: 'Booking expired (unpaid after 30 minutes)',
      }),
    );
  });

  it('continues processing remaining bookings even if publishEvent throws for one', async () => {
    const expiredRows = [
      { id: 1, uuid: 'booking-uuid-105', companyId: 10 },
      { id: 2, uuid: 'booking-uuid-106', companyId: 10 },
    ];

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(expiredRows),
        }),
      }),
    } as never);

    // First publishEvent call fails, second succeeds
    vi.mocked(publishEvent)
      .mockRejectedValueOnce(new Error('Event bus unavailable'))
      .mockResolvedValueOnce(undefined);

    // Should not throw — events are fire-and-forget
    const count = await expirePendingBookings();

    expect(count).toBe(2);
    // publishEvent was attempted for both bookings
    expect(publishEvent).toHaveBeenCalledTimes(2);
  });
});
