/**
 * Buffer Time Calculation Helpers
 *
 * Provides utilities for calculating booking time blocks and detecting conflicts.
 * Buffer times are applied ONLY to existing bookings during conflict detection,
 * NOT to the new slot being checked (prevents double-buffering).
 */

import { addMinutes } from 'date-fns';

/**
 * Service interface for buffer time calculations
 */
export interface ServiceBufferConfig {
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

/**
 * Booking time block with buffer zones
 */
export interface BookingTimeBlock {
  appointmentStart: Date;
  appointmentEnd: Date;
  blockStart: Date;
  blockEnd: Date;
  totalMinutes: number;
}

/**
 * Blocked period for conflict detection
 */
export interface BlockedPeriod {
  start: Date;
  end: Date;
}

/**
 * Calculate booking time block with buffer zones
 *
 * CRITICAL: Buffer times are for conflict detection only.
 * When checking if a new slot is available, buffer times are applied to EXISTING bookings
 * to expand their blocked time range, NOT to the new slot itself.
 *
 * Example:
 * - Existing booking: 10:00-10:30 with 15min buffer_after
 * - Blocked range: 10:00-10:45 (buffer extends END)
 * - New slot at 10:45 is AVAILABLE (not buffered again)
 *
 * @param service - Service configuration with duration and buffer times
 * @param appointmentStart - Start time of the appointment
 * @returns Booking time block with all time boundaries
 */
export function calculateBookingTimeBlock(
  service: ServiceBufferConfig,
  appointmentStart: Date,
): BookingTimeBlock {
  const appointmentEnd = addMinutes(appointmentStart, service.durationMinutes);
  const blockStart = addMinutes(appointmentStart, -service.bufferBeforeMinutes);
  const blockEnd = addMinutes(appointmentEnd, service.bufferAfterMinutes);

  const totalMinutes =
    service.durationMinutes + service.bufferBeforeMinutes + service.bufferAfterMinutes;

  return {
    appointmentStart,
    appointmentEnd,
    blockStart,
    blockEnd,
    totalMinutes,
  };
}

/**
 * Check if a slot conflicts with any blocked period
 *
 * A conflict occurs when the slot overlaps with any blocked period:
 * slotStart < blockedEnd AND slotEnd > blockedStart
 *
 * @param slotStart - Start time of the slot to check
 * @param slotEnd - End time of the slot to check
 * @param blockedPeriods - Array of blocked time periods
 * @returns true if slot conflicts with any blocked period
 */
export function isSlotConflicting(
  slotStart: Date,
  slotEnd: Date,
  blockedPeriods: BlockedPeriod[],
): boolean {
  return blockedPeriods.some((blocked) => {
    // Overlap condition: slot overlaps if it starts before blocked ends AND ends after blocked starts
    return slotStart < blocked.end && slotEnd > blocked.start;
  });
}
