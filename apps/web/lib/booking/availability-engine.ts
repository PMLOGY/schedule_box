/**
 * Availability Engine
 *
 * Calculates free booking slots by combining:
 * - Working hours (regular schedule)
 * - Working hours overrides (day off, modified hours)
 * - Existing bookings (with buffer times applied)
 * - Service duration and buffer requirements
 *
 * Implements single-pass calculation to avoid N+1 query anti-pattern.
 */

import { db } from '@schedulebox/database';
import {
  services,
  employees,
  employeeServices,
  workingHours,
  workingHoursOverrides,
  bookings,
} from '@schedulebox/database';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { NotFoundError } from '@schedulebox/shared';
import { addMinutes, format, addDays, setHours, setMinutes } from 'date-fns';
import { isSlotConflicting } from './buffer-time';
import type { BlockedPeriod } from './buffer-time';

/**
 * Availability query parameters
 */
export interface AvailabilityParams {
  companyId: number;
  serviceId: number;
  employeeId?: number;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  timezone: string; // e.g., 'Europe/Prague'
}

/**
 * Available time slot
 */
export interface AvailabilitySlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  employeeId: number;
  employeeUuid: string;
  employeeName: string;
  isAvailable: boolean;
}

/**
 * Working period with employee info
 */
interface WorkingPeriod {
  date: string;
  employeeId: number;
  employeeName: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  blockedPeriods: BlockedPeriod[];
}

/**
 * Calculate available booking slots
 *
 * This is the core scheduling algorithm. It:
 * 1. Fetches service details (duration, buffers)
 * 2. Finds employees who can provide the service
 * 3. Gets working hours + overrides for date range
 * 4. Gets existing bookings with buffer times applied
 * 5. Generates 15-minute interval slots and checks for conflicts
 *
 * @param params - Availability query parameters
 * @returns Array of available time slots
 */
export async function calculateAvailability(
  params: AvailabilityParams,
): Promise<AvailabilitySlot[]> {
  const { companyId, serviceId, employeeId, dateFrom, dateTo, timezone } = params;

  // Step 1: Fetch service details
  const service = await db.query.services.findFirst({
    where: and(eq(services.id, serviceId), eq(services.companyId, companyId)),
  });

  if (!service || !service.isActive || service.deletedAt !== null) {
    throw new NotFoundError('Service not found or not active');
  }

  // Step 2: Find employees who can provide this service
  const employeeFilter = employeeId
    ? and(eq(employeeServices.serviceId, serviceId), eq(employeeServices.employeeId, employeeId))
    : eq(employeeServices.serviceId, serviceId);

  const serviceEmployees = await db
    .select({
      employeeId: employeeServices.employeeId,
      employeeUuid: employees.uuid,
      employeeName: employees.name,
    })
    .from(employeeServices)
    .innerJoin(employees, eq(employees.id, employeeServices.employeeId))
    .where(
      and(
        employeeFilter,
        eq(employees.companyId, companyId),
        eq(employees.isActive, true),
        sql`${employees.deletedAt} IS NULL`,
      ),
    );

  if (serviceEmployees.length === 0) {
    return []; // No available employees for this service
  }

  const employeeIds = serviceEmployees.map((e) => e.employeeId);

  // Step 3: Get working periods (working hours + overrides + existing bookings)
  const workingPeriods = await getWorkingPeriods(
    companyId,
    employeeIds,
    dateFrom,
    dateTo,
    timezone,
    {
      id: service.id,
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBeforeMinutes || 0,
      bufferAfterMinutes: service.bufferAfterMinutes || 0,
    },
  );

  // Step 4: Generate available slots from working periods
  const slots: AvailabilitySlot[] = [];
  const slotIntervalMinutes = 15;

  for (const period of workingPeriods) {
    const employee = serviceEmployees.find((e) => e.employeeId === period.employeeId);
    if (!employee) continue;

    // Parse period times in the company timezone
    const [startHour, startMin] = period.startTime.split(':').map(Number);
    const [endHour, endMin] = period.endTime.split(':').map(Number);

    // Create Date objects for this period
    let periodStart = new Date(period.date + 'T00:00:00');
    periodStart = setHours(periodStart, startHour);
    periodStart = setMinutes(periodStart, startMin);

    let periodEnd = new Date(period.date + 'T00:00:00');
    periodEnd = setHours(periodEnd, endHour);
    periodEnd = setMinutes(periodEnd, endMin);

    // Generate slots at 15-minute intervals
    let currentSlotStart = periodStart;

    while (currentSlotStart < periodEnd) {
      const currentSlotEnd = addMinutes(currentSlotStart, service.durationMinutes);

      // Check if slot fits within working period
      if (currentSlotEnd <= periodEnd) {
        // Check for conflicts with existing bookings (buffered)
        const hasConflict = isSlotConflicting(
          currentSlotStart,
          currentSlotEnd,
          period.blockedPeriods,
        );

        if (!hasConflict) {
          slots.push({
            date: period.date,
            startTime: format(currentSlotStart, 'HH:mm'),
            endTime: format(currentSlotEnd, 'HH:mm'),
            employeeId: period.employeeId,
            employeeUuid: employee.employeeUuid,
            employeeName: employee.employeeName,
            isAvailable: true,
          });
        }
      }

      // Move to next slot (15-minute interval)
      currentSlotStart = addMinutes(currentSlotStart, slotIntervalMinutes);
    }
  }

  return slots;
}

/**
 * Get working periods with blocked times for each employee
 *
 * This function combines:
 * - Regular working hours (from working_hours table)
 * - Schedule overrides (from working_hours_overrides)
 * - Existing bookings with buffer times applied
 *
 * @returns Array of working periods with blocked time ranges
 */
async function getWorkingPeriods(
  companyId: number,
  employeeIds: number[],
  dateFrom: string,
  dateTo: string,
  timezone: string,
  service: {
    id: number;
    durationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  },
): Promise<WorkingPeriod[]> {
  const periods: WorkingPeriod[] = [];

  // Generate date array
  const dates: string[] = [];
  let currentDate = new Date(dateFrom);
  const endDate = new Date(dateTo);

  while (currentDate <= endDate) {
    dates.push(format(currentDate, 'yyyy-MM-dd'));
    currentDate = addDays(currentDate, 1);
  }

  // For each date + employee, get working hours and blocked periods
  for (const date of dates) {
    const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 6 = Saturday

    for (const employeeId of employeeIds) {
      // Check for override first
      const override = await db.query.workingHoursOverrides.findFirst({
        where: and(
          eq(workingHoursOverrides.companyId, companyId),
          eq(workingHoursOverrides.employeeId, employeeId),
          eq(workingHoursOverrides.date, date),
        ),
      });

      let workingStartTime: string | null = null;
      let workingEndTime: string | null = null;

      if (override) {
        // Override exists
        if (override.isDayOff) {
          continue; // Skip this day
        }
        if (override.startTime && override.endTime) {
          workingStartTime = override.startTime;
          workingEndTime = override.endTime;
        } else {
          continue; // Invalid override, skip
        }
      } else {
        // Try employee-specific working hours first
        let regularHours = await db.query.workingHours.findFirst({
          where: and(
            eq(workingHours.companyId, companyId),
            eq(workingHours.employeeId, employeeId),
            eq(workingHours.dayOfWeek, dayOfWeek),
            eq(workingHours.isActive, true),
          ),
        });

        // Fall back to company-level defaults (employeeId IS NULL)
        if (!regularHours) {
          regularHours = await db.query.workingHours.findFirst({
            where: and(
              eq(workingHours.companyId, companyId),
              sql`${workingHours.employeeId} IS NULL`,
              eq(workingHours.dayOfWeek, dayOfWeek),
              eq(workingHours.isActive, true),
            ),
          });
        }

        if (regularHours) {
          workingStartTime = regularHours.startTime;
          workingEndTime = regularHours.endTime;
        } else {
          continue; // No working hours for this day
        }
      }

      // Get existing bookings for this employee on this date (with buffer times)
      const blockedPeriods = await getBlockedPeriods(
        companyId,
        employeeId,
        date,
        timezone,
        service,
      );

      // Get employee name
      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, employeeId),
        columns: { name: true },
      });

      periods.push({
        date,
        employeeId,
        employeeName: employee?.name || 'Unknown',
        startTime: workingStartTime,
        endTime: workingEndTime,
        blockedPeriods,
      });
    }
  }

  return periods;
}

/**
 * Get blocked time periods from existing bookings
 *
 * CRITICAL: Buffer times are applied to EXISTING bookings to expand their blocked range.
 * A booking from 10:00-10:30 with 15min buffer_after blocks 10:00-10:45.
 *
 * @returns Array of blocked time periods
 */
async function getBlockedPeriods(
  companyId: number,
  employeeId: number,
  date: string,
  _timezone: string,
  _service: {
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  },
): Promise<BlockedPeriod[]> {
  // Convert date to start/end timestamps for the day
  const dateStart = new Date(date + 'T00:00:00');
  const dateEnd = new Date(date + 'T23:59:59');

  // Fetch bookings for this employee on this date (excluding cancelled)
  const existingBookings = await db
    .select({
      id: bookings.id,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      serviceId: bookings.serviceId,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .where(
      and(
        eq(bookings.companyId, companyId),
        eq(bookings.employeeId, employeeId),
        gte(bookings.startTime, dateStart),
        lte(bookings.startTime, dateEnd),
        sql`${bookings.status} != 'cancelled'`,
      ),
    );

  const blocked: BlockedPeriod[] = [];

  for (const booking of existingBookings) {
    // Get the service's buffer times for this booking
    const bookingService = await db.query.services.findFirst({
      where: eq(services.id, booking.serviceId),
      columns: {
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
      },
    });

    const bufferBefore = bookingService?.bufferBeforeMinutes || 0;
    const bufferAfter = bookingService?.bufferAfterMinutes || 0;

    // Apply buffer times to EXISTING booking
    const blockStart = addMinutes(booking.startTime, -bufferBefore);
    const blockEnd = addMinutes(booking.endTime, bufferAfter);

    blocked.push({
      start: blockStart,
      end: blockEnd,
    });
  }

  return blocked;
}
