/**
 * Unit tests for buffer-time utility module
 *
 * Pure math functions — no mocking needed.
 * Targets 100% branch coverage on buffer-time.ts.
 */

import { describe, it, expect } from 'vitest';
import { calculateBookingTimeBlock, isSlotConflicting } from './buffer-time';
import type { ServiceBufferConfig, BlockedPeriod } from './buffer-time';

// Helper: build a Date on 2024-01-15 at HH:mm
function makeDate(hour: number, minute: number = 0): Date {
  const d = new Date('2024-01-15T00:00:00');
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// calculateBookingTimeBlock
// ---------------------------------------------------------------------------

describe('calculateBookingTimeBlock', () => {
  it('returns correct start/end with zero buffers', () => {
    const service: ServiceBufferConfig = {
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    };
    const start = makeDate(10, 0);

    const block = calculateBookingTimeBlock(service, start);

    expect(block.appointmentStart).toEqual(start);
    expect(block.appointmentEnd).toEqual(makeDate(11, 0));
    expect(block.blockStart).toEqual(start); // no buffer before
    expect(block.blockEnd).toEqual(makeDate(11, 0)); // no buffer after
    expect(block.totalMinutes).toBe(60);
  });

  it('expands block correctly with 15min before + 10min after', () => {
    const service: ServiceBufferConfig = {
      durationMinutes: 30,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 10,
    };
    const start = makeDate(10, 0);

    const block = calculateBookingTimeBlock(service, start);

    expect(block.appointmentStart).toEqual(makeDate(10, 0));
    expect(block.appointmentEnd).toEqual(makeDate(10, 30));
    expect(block.blockStart).toEqual(makeDate(9, 45)); // 15 min before
    expect(block.blockEnd).toEqual(makeDate(10, 40)); // 10 min after end
    expect(block.totalMinutes).toBe(55); // 30 + 15 + 10
  });

  it('handles large duration (2 hours) with symmetric buffers', () => {
    const service: ServiceBufferConfig = {
      durationMinutes: 120,
      bufferBeforeMinutes: 20,
      bufferAfterMinutes: 20,
    };
    const start = makeDate(14, 0);

    const block = calculateBookingTimeBlock(service, start);

    expect(block.appointmentEnd).toEqual(makeDate(16, 0));
    expect(block.blockStart).toEqual(makeDate(13, 40));
    expect(block.blockEnd).toEqual(makeDate(16, 20));
    expect(block.totalMinutes).toBe(160);
  });

  it('totalMinutes is sum of duration + buffers', () => {
    const service: ServiceBufferConfig = {
      durationMinutes: 45,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
    };
    const block = calculateBookingTimeBlock(service, makeDate(9, 0));
    expect(block.totalMinutes).toBe(60); // 45 + 5 + 10
  });
});

// ---------------------------------------------------------------------------
// isSlotConflicting
// ---------------------------------------------------------------------------

describe('isSlotConflicting', () => {
  it('returns false when blocked periods array is empty', () => {
    const result = isSlotConflicting(makeDate(9, 0), makeDate(10, 0), []);
    expect(result).toBe(false);
  });

  it('returns false when slot is entirely before a blocked period', () => {
    const blocked: BlockedPeriod[] = [{ start: makeDate(11, 0), end: makeDate(12, 0) }];
    const result = isSlotConflicting(makeDate(9, 0), makeDate(10, 0), blocked);
    expect(result).toBe(false);
  });

  it('returns false when slot is entirely after a blocked period', () => {
    const blocked: BlockedPeriod[] = [{ start: makeDate(9, 0), end: makeDate(10, 0) }];
    const result = isSlotConflicting(makeDate(10, 0), makeDate(11, 0), blocked);
    expect(result).toBe(false);
  });

  it('returns true when slot overlaps the start of a blocked period', () => {
    // Slot 10:30-11:30, blocked 11:00-12:00 → overlap
    const blocked: BlockedPeriod[] = [{ start: makeDate(11, 0), end: makeDate(12, 0) }];
    const result = isSlotConflicting(makeDate(10, 30), makeDate(11, 30), blocked);
    expect(result).toBe(true);
  });

  it('returns true when slot overlaps the end of a blocked period', () => {
    // Slot 11:30-12:30, blocked 11:00-12:00 → overlap
    const blocked: BlockedPeriod[] = [{ start: makeDate(11, 0), end: makeDate(12, 0) }];
    const result = isSlotConflicting(makeDate(11, 30), makeDate(12, 30), blocked);
    expect(result).toBe(true);
  });

  it('returns true when slot is fully inside a blocked period', () => {
    const blocked: BlockedPeriod[] = [{ start: makeDate(10, 0), end: makeDate(12, 0) }];
    const result = isSlotConflicting(makeDate(10, 30), makeDate(11, 30), blocked);
    expect(result).toBe(true);
  });

  it('returns true when slot fully contains a blocked period', () => {
    // Slot 9-13, blocked 10-12
    const blocked: BlockedPeriod[] = [{ start: makeDate(10, 0), end: makeDate(12, 0) }];
    const result = isSlotConflicting(makeDate(9, 0), makeDate(13, 0), blocked);
    expect(result).toBe(true);
  });

  it('returns false for adjacent (touching) periods — no actual overlap', () => {
    // Slot ends exactly when blocked starts — no overlap (strict <)
    const blocked: BlockedPeriod[] = [{ start: makeDate(11, 0), end: makeDate(12, 0) }];
    // slotEnd === blocked.start → NOT < blocked.end, slotStart === blocked.end → NOT > blocked.start
    // Actually: slotStart(10:00) < blocked.end(12:00) AND slotEnd(11:00) > blocked.start(11:00)?
    // 11:00 > 11:00 is false → no conflict
    const result = isSlotConflicting(makeDate(10, 0), makeDate(11, 0), blocked);
    expect(result).toBe(false);
  });

  it('returns true when slot conflicts with one of multiple blocked periods', () => {
    const blocked: BlockedPeriod[] = [
      { start: makeDate(9, 0), end: makeDate(9, 30) },
      { start: makeDate(11, 0), end: makeDate(11, 30) },
      { start: makeDate(14, 0), end: makeDate(15, 0) },
    ];
    // Slot 11:15-12:00 conflicts with second period
    const result = isSlotConflicting(makeDate(11, 15), makeDate(12, 0), blocked);
    expect(result).toBe(true);
  });

  it('returns false when slot is between two blocked periods (no overlap with either)', () => {
    const blocked: BlockedPeriod[] = [
      { start: makeDate(9, 0), end: makeDate(10, 0) },
      { start: makeDate(11, 0), end: makeDate(12, 0) },
    ];
    // Slot 10:00-11:00 — adjacent to both, no overlap
    const result = isSlotConflicting(makeDate(10, 0), makeDate(11, 0), blocked);
    expect(result).toBe(false);
  });

  it('handles midnight boundary correctly (23:00-00:00 range)', () => {
    // Blocked period near midnight
    const d1 = new Date('2024-01-15T23:00:00');
    const d2 = new Date('2024-01-16T00:00:00');
    const blocked: BlockedPeriod[] = [{ start: d1, end: d2 }];

    // Slot within blocked range
    const slotStart = new Date('2024-01-15T23:30:00');
    const slotEnd = new Date('2024-01-16T00:00:00'); // ends at midnight, not > d1 start

    // slotStart(23:30) < blocked.end(00:00 next day) AND slotEnd(00:00) > blocked.start(23:00)
    // slotEnd > blocked.start? 00:00 next day > 23:00 same day = true
    const result = isSlotConflicting(slotStart, slotEnd, blocked);
    expect(result).toBe(true);
  });
});
