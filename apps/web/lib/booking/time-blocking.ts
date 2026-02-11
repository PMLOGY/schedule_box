/**
 * Time Blocking Service
 *
 * Admin-facing service for blocking time slots to prevent bookings.
 * Two approaches supported:
 *
 * 1. Full-day blocking: Use existing schedule overrides API with is_day_off=true
 *    (Already implemented in Phase 3, Plan 07)
 *
 * 2. Partial-day blocking: Split working hours around blocked time using overrides
 *    Example: Working 9:00-17:00, block 12:00-13:00 → creates overrides for 9:00-12:00 and 13:00-17:00
 *
 * The availability engine (05-03) already respects working_hours_overrides, so blocked time
 * automatically appears as unavailable.
 */

import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { db, employees, workingHours, workingHoursOverrides } from '@schedulebox/database';
import { NotFoundError, ValidationError } from '@schedulebox/shared';

/**
 * Block a specific time range within a working day
 * Splits employee's working hours around the blocked period
 *
 * Algorithm:
 * 1. Get employee's working hours for the date (check overrides first, then regular hours)
 * 2. If block covers entire working day → create is_day_off=true override
 * 3. Otherwise, split working hours around block:
 *    - If working 9:00-17:00, block 12:00-13:00 → overrides: 9:00-12:00, 13:00-17:00
 *    - If working 9:00-17:00, block 9:00-10:00 → override: 10:00-17:00
 *    - If working 9:00-17:00, block 16:00-17:00 → override: 9:00-16:00
 * 4. Store reason in override reason field
 *
 * @param input - Block parameters
 * @param companyId - Company scope
 * @returns Created override IDs
 */
export async function blockTimeSlot(
  input: {
    employeeId: number;
    date: string; // YYYY-MM-DD format
    blockStartTime: string; // HH:MM format
    blockEndTime: string; // HH:MM format
    reason?: string;
  },
  companyId: number,
): Promise<{ overrideIds: number[]; blockedPeriods: Array<{ start: string; end: string }> }> {
  const { employeeId, date, blockStartTime, blockEndTime, reason } = input;

  // Validate time format
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(blockStartTime) || !timeRegex.test(blockEndTime)) {
    throw new ValidationError('Invalid time format. Use HH:MM format (e.g., 09:00, 14:30)');
  }

  if (blockStartTime >= blockEndTime) {
    throw new ValidationError('Block end time must be after start time');
  }

  return await db.transaction(async (tx) => {
    // Verify employee exists and belongs to company
    const [employee] = await tx
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.companyId, companyId),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    // Step 1: Check if override already exists for this date
    const existingOverride = await tx
      .select()
      .from(workingHoursOverrides)
      .where(
        and(
          eq(workingHoursOverrides.companyId, companyId),
          eq(workingHoursOverrides.employeeId, employeeId),
          eq(workingHoursOverrides.date, date),
        ),
      );

    // Step 2: Get employee's working hours for this day of week
    // First try employee-specific hours, then fall back to company defaults
    let regularHours = await tx
      .select()
      .from(workingHours)
      .where(
        and(
          eq(workingHours.companyId, companyId),
          eq(workingHours.employeeId, employeeId),
          eq(workingHours.dayOfWeek, dayOfWeek),
        ),
      );

    // Fallback to company-level defaults (employeeId IS NULL)
    if (regularHours.length === 0) {
      regularHours = await tx
        .select()
        .from(workingHours)
        .where(
          and(
            eq(workingHours.companyId, companyId),
            isNull(workingHours.employeeId),
            eq(workingHours.dayOfWeek, dayOfWeek),
          ),
        );
    }

    // If no regular hours found, employee doesn't work on this day
    if (regularHours.length === 0) {
      throw new ValidationError('Employee does not work on this day of the week');
    }

    // Find the working hour period that contains the block
    const workingPeriod = regularHours.find(
      (wh) => wh.startTime <= blockStartTime && wh.endTime >= blockEndTime,
    );

    if (!workingPeriod) {
      throw new ValidationError('Block time is outside employee working hours');
    }

    const workStartTime = workingPeriod.startTime;
    const workEndTime = workingPeriod.endTime;

    // Step 3: Determine if block covers entire working day
    const blocksEntireDay = blockStartTime <= workStartTime && blockEndTime >= workEndTime;

    // Delete existing overrides for this date (we'll replace them)
    if (existingOverride.length > 0) {
      await tx
        .delete(workingHoursOverrides)
        .where(
          and(
            eq(workingHoursOverrides.companyId, companyId),
            eq(workingHoursOverrides.employeeId, employeeId),
            eq(workingHoursOverrides.date, date),
          ),
        );
    }

    const overrideIds: number[] = [];

    if (blocksEntireDay) {
      // Create a full day-off override
      const [override] = await tx
        .insert(workingHoursOverrides)
        .values({
          companyId,
          employeeId,
          date,
          startTime: null,
          endTime: null,
          isDayOff: true,
          reason: reason || 'Time blocked',
        })
        .returning({ id: workingHoursOverrides.id });

      overrideIds.push(override.id);

      return {
        overrideIds,
        blockedPeriods: [{ start: workStartTime, end: workEndTime }],
      };
    }

    // Step 4: Split working hours around blocked period
    const blockedPeriods: Array<{ start: string; end: string }> = [];

    // Create override for period BEFORE block (if any)
    if (workStartTime < blockStartTime) {
      const [override] = await tx
        .insert(workingHoursOverrides)
        .values({
          companyId,
          employeeId,
          date,
          startTime: workStartTime,
          endTime: blockStartTime,
          isDayOff: false,
          reason: reason
            ? `Available hours (blocked: ${reason})`
            : 'Available hours (partial block)',
        })
        .returning({ id: workingHoursOverrides.id });

      overrideIds.push(override.id);
    }

    // Record the blocked period
    blockedPeriods.push({ start: blockStartTime, end: blockEndTime });

    // Create override for period AFTER block (if any)
    if (workEndTime > blockEndTime) {
      const [override] = await tx
        .insert(workingHoursOverrides)
        .values({
          companyId,
          employeeId,
          date,
          startTime: blockEndTime,
          endTime: workEndTime,
          isDayOff: false,
          reason: reason
            ? `Available hours (blocked: ${reason})`
            : 'Available hours (partial block)',
        })
        .returning({ id: workingHoursOverrides.id });

      overrideIds.push(override.id);
    }

    return { overrideIds, blockedPeriods };
  });
}

/**
 * Remove time block by deleting schedule overrides
 * Restores original working hours for the date
 *
 * @param overrideId - Override ID to delete
 * @param companyId - Company scope
 */
export async function unblockTimeSlot(overrideId: number, companyId: number): Promise<void> {
  // Verify override exists and belongs to company
  const [override] = await db
    .select({ id: workingHoursOverrides.id })
    .from(workingHoursOverrides)
    .where(
      and(eq(workingHoursOverrides.id, overrideId), eq(workingHoursOverrides.companyId, companyId)),
    )
    .limit(1);

  if (!override) {
    throw new NotFoundError('Time block not found');
  }

  // Delete the override
  await db.delete(workingHoursOverrides).where(eq(workingHoursOverrides.id, overrideId));
}

/**
 * List blocked time slots for an employee within a date range
 * Identifies gaps in working hours caused by overrides
 *
 * @param employeeId - Employee ID
 * @param dateFrom - Start date (YYYY-MM-DD)
 * @param dateTo - End date (YYYY-MM-DD)
 * @param companyId - Company scope
 * @returns Array of blocked periods
 */
export async function listBlockedSlots(
  employeeId: number,
  dateFrom: string,
  dateTo: string,
  companyId: number,
): Promise<
  Array<{
    id: number;
    date: string;
    start_time: string | null;
    end_time: string | null;
    is_day_off: boolean | null;
    reason: string | null;
    blocked_periods?: Array<{ start: string; end: string }>;
  }>
> {
  // Verify employee exists and belongs to company
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(employees.id, employeeId),
        eq(employees.companyId, companyId),
        isNull(employees.deletedAt),
      ),
    )
    .limit(1);

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  // Get all overrides in date range
  const overrides = await db
    .select({
      id: workingHoursOverrides.id,
      date: workingHoursOverrides.date,
      start_time: workingHoursOverrides.startTime,
      end_time: workingHoursOverrides.endTime,
      is_day_off: workingHoursOverrides.isDayOff,
      reason: workingHoursOverrides.reason,
    })
    .from(workingHoursOverrides)
    .where(
      and(
        eq(workingHoursOverrides.companyId, companyId),
        eq(workingHoursOverrides.employeeId, employeeId),
        gte(workingHoursOverrides.date, dateFrom),
        lte(workingHoursOverrides.date, dateTo),
      ),
    )
    .orderBy(workingHoursOverrides.date, workingHoursOverrides.startTime);

  // Group overrides by date to identify blocked periods
  const overridesByDate = new Map<string, typeof overrides>();
  for (const override of overrides) {
    const date = override.date;
    if (!overridesByDate.has(date)) {
      overridesByDate.set(date, []);
    }
    const dateOverrides = overridesByDate.get(date);
    if (dateOverrides) {
      dateOverrides.push(override);
    }
  }

  // For each date with overrides, calculate blocked periods
  const result: Array<{
    id: number;
    date: string;
    start_time: string | null;
    end_time: string | null;
    is_day_off: boolean | null;
    reason: string | null;
    blocked_periods?: Array<{ start: string; end: string }>;
  }> = [];

  for (const [date, dateOverrides] of overridesByDate) {
    // If day off, entire day is blocked
    const dayOffOverride = dateOverrides.find((o) => o.is_day_off);
    if (dayOffOverride) {
      result.push({
        id: dayOffOverride.id,
        date,
        start_time: null,
        end_time: null,
        is_day_off: true,
        reason: dayOffOverride.reason,
      });
      continue;
    }

    // Get regular working hours for this day to identify gaps
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    const regularHours = await db
      .select({
        start_time: workingHours.startTime,
        end_time: workingHours.endTime,
      })
      .from(workingHours)
      .where(
        and(
          eq(workingHours.companyId, companyId),
          eq(workingHours.employeeId, employeeId),
          eq(workingHours.dayOfWeek, dayOfWeek),
        ),
      );

    if (regularHours.length === 0) {
      // No regular hours, can't determine blocks
      continue;
    }

    // Find gaps between regular hours and overrides
    // This is a simplified approach: compare regular start/end with override start/end
    const regularStart = regularHours[0].start_time;
    const regularEnd = regularHours[0].end_time;

    const blockedPeriods: Array<{ start: string; end: string }> = [];

    // Sort overrides by start time
    const sortedOverrides = dateOverrides.sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      return a.start_time.localeCompare(b.start_time);
    });

    // Check if there's a gap at the start
    if (sortedOverrides[0].start_time && sortedOverrides[0].start_time > regularStart) {
      blockedPeriods.push({ start: regularStart, end: sortedOverrides[0].start_time });
    }

    // Check for gaps between consecutive overrides
    for (let i = 0; i < sortedOverrides.length - 1; i++) {
      const current = sortedOverrides[i];
      const next = sortedOverrides[i + 1];
      if (current.end_time && next.start_time && current.end_time < next.start_time) {
        blockedPeriods.push({ start: current.end_time, end: next.start_time });
      }
    }

    // Check if there's a gap at the end
    const lastOverride = sortedOverrides[sortedOverrides.length - 1];
    if (lastOverride.end_time && lastOverride.end_time < regularEnd) {
      blockedPeriods.push({ start: lastOverride.end_time, end: regularEnd });
    }

    // Return the first override with blocked periods metadata
    if (sortedOverrides.length > 0 && blockedPeriods.length > 0) {
      result.push({
        id: sortedOverrides[0].id,
        date,
        start_time: blockedPeriods[0].start,
        end_time: blockedPeriods[blockedPeriods.length - 1].end,
        is_day_off: false,
        reason: sortedOverrides[0].reason,
        blocked_periods: blockedPeriods,
      });
    }
  }

  return result;
}
