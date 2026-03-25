/**
 * Unit tests for calculateAvailability — the core scheduling algorithm.
 *
 * Target: >=90% branch coverage on availability-engine.ts.
 *
 * All DB calls are mocked. date-fns and buffer-time.ts run real (pure math).
 *
 * DB query structure in availability-engine.ts:
 *   - db.query.services.findFirst()          — Step 1: service lookup
 *   - db.select().from(employeeServices).innerJoin(employees).where() — Step 2: employees
 *   - (per date+employee loop):
 *     - db.query.workingHoursOverrides.findFirst() — override check
 *     - db.query.workingHours.findFirst()          — employee-specific hours
 *     - db.query.workingHours.findFirst()          — company-default hours (fallback)
 *     - db.select().from(bookings).innerJoin(services).where() — existing bookings
 *     - (per booking): db.query.services.findFirst() — booking service buffers
 *     - db.query.employees.findFirst()             — employee name lookup
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mock — must be before any import that touches @schedulebox/database
// ---------------------------------------------------------------------------

vi.mock('@schedulebox/database', () => ({
  db: {
    query: {
      services: { findFirst: vi.fn() },
      employees: { findFirst: vi.fn() },
      workingHours: { findFirst: vi.fn() },
      workingHoursOverrides: { findFirst: vi.fn() },
    },
    select: vi.fn(),
  },
  services: {},
  employees: {},
  employeeServices: {},
  workingHours: {},
  workingHoursOverrides: {},
  bookings: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(),
}));

import { calculateAvailability } from './availability-engine';
import { db } from '@schedulebox/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_PARAMS = {
  companyId: 1,
  serviceId: 10,
  dateFrom: '2026-04-07', // Monday
  dateTo: '2026-04-07',
  timezone: 'Europe/Prague',
};

/** A standard active service (60-min, no buffers) */
const MOCK_SERVICE = {
  id: 10,
  isActive: true,
  deletedAt: null,
  durationMinutes: 60,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
};

/** A single employee returned from the employee join */
const MOCK_EMPLOYEE_ROW = {
  employeeId: 5,
  employeeUuid: 'emp-uuid-5',
  employeeName: 'Jan Novak',
};

/** Working hours 09:00-17:00 Monday (dayOfWeek=1) */
const MOCK_WORKING_HOURS = {
  startTime: '09:00',
  endTime: '17:00',
  isActive: true,
};

/** Build a Drizzle select-chain mock that resolves to `rows` */
function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateAvailability', () => {
  // -------------------------------------------------------------------------
  // Branch: service not found → throws NotFoundError
  // -------------------------------------------------------------------------

  it('throws NotFoundError when service not found (returns null)', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(undefined as any);

    await expect(calculateAvailability(BASE_PARAMS)).rejects.toThrow('Service not found');
  });

  it('throws NotFoundError when service.isActive is false', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce({
      ...MOCK_SERVICE,
      isActive: false,
    } as any);

    await expect(calculateAvailability(BASE_PARAMS)).rejects.toThrow('Service not found');
  });

  it('throws NotFoundError when service.deletedAt is non-null (soft-deleted)', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce({
      ...MOCK_SERVICE,
      deletedAt: new Date('2026-01-01'),
    } as any);

    await expect(calculateAvailability(BASE_PARAMS)).rejects.toThrow('Service not found');
  });

  // -------------------------------------------------------------------------
  // Branch: no employees found → returns []
  // -------------------------------------------------------------------------

  it('returns empty array when no employees are assigned to the service', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);

    // Employee join returns empty array
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);

    const result = await calculateAvailability(BASE_PARAMS);
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Branch: filters by specific employeeId when provided
  // -------------------------------------------------------------------------

  it('applies employeeId filter in query when param is provided', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);

    // Employee join returns the specific employee
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    // No override
    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(null as any);
    // Employee-specific working hours found
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce(MOCK_WORKING_HOURS as any);
    // No existing bookings
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    // Employee name
    vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Jan Novak' } as any);

    const result = await calculateAvailability({ ...BASE_PARAMS, employeeId: 5 });

    // Should return slots (employeeId filter was applied, employee found)
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].employeeId).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Branch: override — isDayOff = true → no slots for that date
  // -------------------------------------------------------------------------

  it('returns empty array when override marks the day as day-off', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    // Override: day off
    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce({
      isDayOff: true,
      startTime: null,
      endTime: null,
    } as any);

    const result = await calculateAvailability(BASE_PARAMS);
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Branch: override exists but startTime/endTime are null → skip (invalid)
  // -------------------------------------------------------------------------

  it('skips day when override exists with isDayOff=false but no start/end times', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    // Override: not a day off, but missing times (invalid override)
    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce({
      isDayOff: false,
      startTime: null,
      endTime: null,
    } as any);

    const result = await calculateAvailability(BASE_PARAMS);
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Branch: override with modified hours → slots only within modified range
  // -------------------------------------------------------------------------

  it('generates slots within modified hours from override (not full-day schedule)', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    // Override: modified hours 13:00-15:00 (only 2 hours)
    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce({
      isDayOff: false,
      startTime: '13:00',
      endTime: '15:00',
    } as any);

    // No existing bookings
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Jan Novak' } as any);

    const result = await calculateAvailability(BASE_PARAMS);

    // 13:00-15:00 with 60-min service, 15-min intervals → 13:00 and 14:00
    const times = result.map((s) => s.startTime);
    expect(times).toContain('13:00');
    expect(times).toContain('14:00');
    expect(times).not.toContain('12:00');
    expect(times).not.toContain('15:00'); // 15:00+60min > 15:00 end
  });

  // -------------------------------------------------------------------------
  // Branch: no working hours (no override, no employee-specific, no company default) → skip
  // -------------------------------------------------------------------------

  it('returns empty array when no working hours defined for the day', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    // No override
    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(null as any);
    // No employee-specific hours
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce(null as any);
    // No company-level default hours either
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce(null as any);

    const result = await calculateAvailability(BASE_PARAMS);
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Branch: company-level working hours fallback (employeeId IS NULL)
  // -------------------------------------------------------------------------

  it('falls back to company-level working hours when employee-specific hours absent', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    // No override
    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(null as any);
    // First call: no employee-specific hours
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce(null as any);
    // Second call: company-level hours
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce({
      startTime: '10:00',
      endTime: '12:00',
      isActive: true,
    } as any);

    // No existing bookings
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Jan Novak' } as any);

    const result = await calculateAvailability(BASE_PARAMS);

    // 10:00-12:00 with 60-min service, 15-min intervals → 10:00, 10:15, 10:30, 10:45, 11:00 = 5 slots
    expect(result.length).toBe(5);
    expect(result[0].startTime).toBe('10:00');
    expect(result[result.length - 1].startTime).toBe('11:00');
  });

  // -------------------------------------------------------------------------
  // Branch: generates correct 15-min interval slots for 9-17 schedule + 60-min service
  // -------------------------------------------------------------------------

  it('generates correct 15-min interval slots for 9:00-17:00 with 60-min service', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(null as any);
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce(MOCK_WORKING_HOURS as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Jan Novak' } as any);

    const result = await calculateAvailability(BASE_PARAMS);

    // 09:00 to 16:00 in 15-min increments where slot+60min <= 17:00
    // → 09:00, 09:15, ..., 16:00 = 29 slots
    expect(result.length).toBe(29);
    expect(result[0].startTime).toBe('09:00');
    expect(result[0].endTime).toBe('10:00');
    expect(result[result.length - 1].startTime).toBe('16:00');
    expect(result[result.length - 1].endTime).toBe('17:00');
    expect(result[0].employeeId).toBe(5);
    expect(result[0].employeeUuid).toBe('emp-uuid-5');
    expect(result[0].isAvailable).toBe(true);
    expect(result[0].date).toBe('2026-04-07');
  });

  // -------------------------------------------------------------------------
  // Branch: existing booking conflicts → slot excluded
  // -------------------------------------------------------------------------

  it('filters out slots that conflict with existing confirmed bookings', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(null as any);
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce({
      startTime: '09:00',
      endTime: '11:00',
      isActive: true,
    } as any);

    // Existing booking: 09:00-10:00 (exactly the first slot)
    const existingBookingStart = new Date('2026-04-07T09:00:00');
    const existingBookingEnd = new Date('2026-04-07T10:00:00');
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([
        {
          id: 99,
          startTime: existingBookingStart,
          endTime: existingBookingEnd,
          serviceId: 10,
        },
      ]) as any,
    );

    // Booking service buffers (no buffers)
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce({
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    } as any);

    vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Jan Novak' } as any);

    const result = await calculateAvailability(BASE_PARAMS);

    // 09:00-11:00 with 60-min service → 09:00 and 10:00
    // 09:00 conflicts with the booking (09:00-10:00 overlaps 09:00-10:00)
    // 10:00 does NOT conflict (slotEnd=11:00 > blocked.start=09:00 AND slotStart=10:00 < blocked.end=10:00? No: 10:00 < 10:00 is false)
    const times = result.map((s) => s.startTime);
    expect(times).not.toContain('09:00'); // excluded due to conflict
    expect(times).toContain('10:00'); // available — booking ended at 10:00, no overlap
  });

  // -------------------------------------------------------------------------
  // Branch: booking with buffer after → expands blocked period
  // -------------------------------------------------------------------------

  it('filters slots within buffer time of existing booking', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(null as any);
    // Working hours: 09:00-11:00
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce({
      startTime: '09:00',
      endTime: '11:00',
      isActive: true,
    } as any);

    // Existing booking: 09:00-09:30
    const existingBookingStart = new Date('2026-04-07T09:00:00');
    const existingBookingEnd = new Date('2026-04-07T09:30:00');
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([
        {
          id: 88,
          startTime: existingBookingStart,
          endTime: existingBookingEnd,
          serviceId: 10,
        },
      ]) as any,
    );

    // Booking service has 30min buffer after → blocks until 10:00
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce({
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 30,
    } as any);

    vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Jan Novak' } as any);

    const result = await calculateAvailability(BASE_PARAMS);

    // Working 09:00-11:00, service=60min → slots: 09:00, 09:15, 09:30, 09:45, 10:00
    // Blocked: 09:00-10:00 (booking end 09:30 + 30min buffer = 10:00)
    // Conflict: slot overlaps if slotStart < 10:00 AND slotEnd > 09:00
    //   09:00-10:00: 09:00 < 10:00 AND 10:00 > 09:00 → conflict
    //   09:15-10:15: 09:15 < 10:00 AND 10:15 > 09:00 → conflict
    //   09:30-10:30: 09:30 < 10:00 AND 10:30 > 09:00 → conflict
    //   09:45-10:45: 09:45 < 10:00 AND 10:45 > 09:00 → conflict
    //   10:00-11:00: 10:00 < 10:00? No → no conflict
    const times = result.map((s) => s.startTime);
    expect(times).not.toContain('09:00');
    expect(times).not.toContain('09:15');
    expect(times).not.toContain('09:30');
    expect(times).not.toContain('09:45');
    expect(times).toContain('10:00');
  });

  // -------------------------------------------------------------------------
  // Branch: multi-day range (3 days)
  // -------------------------------------------------------------------------

  it('handles multi-day date range spanning 3 days', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    // 3 days: 2026-04-07, 2026-04-08, 2026-04-09
    // Each day: no override, employee hours 09:00-10:00, no bookings
    for (let i = 0; i < 3; i++) {
      vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(null as any);
      vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce({
        startTime: '09:00',
        endTime: '10:00',
        isActive: true,
      } as any);
      vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
      vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Jan Novak' } as any);
    }

    const result = await calculateAvailability({
      ...BASE_PARAMS,
      dateFrom: '2026-04-07',
      dateTo: '2026-04-09',
    });

    // 09:00-10:00 with 60-min service → exactly 1 slot per day × 3 days = 3 slots
    expect(result.length).toBe(3);
    const dates = result.map((s) => s.date);
    expect(dates).toContain('2026-04-07');
    expect(dates).toContain('2026-04-08');
    expect(dates).toContain('2026-04-09');
  });

  // -------------------------------------------------------------------------
  // Branch: employee name and uuid are taken from serviceEmployees join result
  // -------------------------------------------------------------------------

  it('returns correct employeeUuid and employeeName from serviceEmployees join', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce(MOCK_SERVICE as any);
    vi.mocked(db.select).mockReturnValueOnce(
      makeSelectChain([
        { employeeId: 7, employeeUuid: 'special-uuid-7', employeeName: 'Petra Novotna' },
      ]) as any,
    );

    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(undefined as any);
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce({
      startTime: '09:00',
      endTime: '10:00',
      isActive: true,
    } as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Petra Novotna' } as any);

    const result = await calculateAvailability(BASE_PARAMS);

    expect(result.length).toBe(1);
    expect(result[0].employeeId).toBe(7);
    expect(result[0].employeeUuid).toBe('special-uuid-7');
    expect(result[0].employeeName).toBe('Petra Novotna');
  });

  // -------------------------------------------------------------------------
  // Branch: service bufferBeforeMinutes is null/undefined → treated as 0
  // -------------------------------------------------------------------------

  it('treats null bufferBeforeMinutes/bufferAfterMinutes as 0 on the service', async () => {
    vi.mocked(db.query.services.findFirst).mockResolvedValueOnce({
      ...MOCK_SERVICE,
      bufferBeforeMinutes: null,
      bufferAfterMinutes: null,
    } as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([MOCK_EMPLOYEE_ROW]) as any);

    vi.mocked(db.query.workingHoursOverrides.findFirst).mockResolvedValueOnce(undefined as any);
    vi.mocked(db.query.workingHours.findFirst).mockResolvedValueOnce({
      startTime: '09:00',
      endTime: '10:00',
      isActive: true,
    } as any);
    vi.mocked(db.select).mockReturnValueOnce(makeSelectChain([]) as any);
    vi.mocked(db.query.employees.findFirst).mockResolvedValueOnce({ name: 'Jan Novak' } as any);

    const result = await calculateAvailability(BASE_PARAMS);

    // Should still produce 1 slot: 09:00-10:00
    expect(result.length).toBe(1);
    expect(result[0].startTime).toBe('09:00');
  });
});
