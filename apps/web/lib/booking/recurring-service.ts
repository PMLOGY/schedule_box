/**
 * Recurring Booking Service Layer
 *
 * Business logic for recurring series CRUD:
 * - Create series with occurrence generation (respects availability)
 * - Edit single occurrence (does not affect others)
 * - Edit all future occurrences in a series
 * - Cancel single occurrence or entire series
 *
 * Each occurrence is a regular booking row with recurringSeriesId set,
 * so existing calendar/list views work without changes.
 */

import { eq, and, gt, or, lt, sql, isNull } from 'drizzle-orm';
import {
  db,
  dbTx,
  bookings,
  recurringSeries,
  services,
  employees,
  employeeServices,
  customers,
} from '@schedulebox/database';
import { AppError, NotFoundError, ValidationError } from '@schedulebox/shared';
import type { PaginationMeta } from '@schedulebox/shared';
import { cancelBooking } from './booking-transitions';
import { getBooking, fireBookingCreatedNotifications } from './booking-service';
import type { RecurringSeriesCreate, RecurringSeriesUpdate } from '@/validations/recurring';

// ============================================================================
// TYPES
// ============================================================================

export interface RecurringSeriesWithMeta {
  id: string; // UUID
  companyId: number;
  serviceId: string; // UUID
  employeeId: string | null; // UUID
  customerId: string; // UUID
  repeatPattern: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  endDate: string | null;
  startTime: string;
  durationMinutes: number;
  maxOccurrences: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  occurrenceCount?: number;
  createdOccurrences?: number;
  skippedOccurrences?: number;
}

// ============================================================================
// UUID RESOLUTION HELPERS
// ============================================================================

async function resolveServiceId(
  serviceUuid: string,
  companyId: number,
): Promise<{
  id: number;
  uuid: string;
  durationMinutes: number;
  price: string;
  currency: string | null;
  bufferBeforeMinutes: number | null;
  bufferAfterMinutes: number | null;
}> {
  const [service] = await db
    .select({
      id: services.id,
      uuid: services.uuid,
      durationMinutes: services.durationMinutes,
      price: services.price,
      currency: services.currency,
      bufferBeforeMinutes: services.bufferBeforeMinutes,
      bufferAfterMinutes: services.bufferAfterMinutes,
      isActive: services.isActive,
    })
    .from(services)
    .where(and(eq(services.uuid, serviceUuid), eq(services.companyId, companyId)))
    .limit(1);

  if (!service) {
    throw new NotFoundError('Service not found');
  }
  if (!service.isActive) {
    throw new ValidationError('Service is not active');
  }
  return service;
}

async function resolveEmployeeId(
  employeeUuid: string,
  companyId: number,
  serviceInternalId: number,
): Promise<{ id: number; uuid: string; name: string }> {
  const [employee] = await db
    .select({
      id: employees.id,
      uuid: employees.uuid,
      name: employees.name,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(
      and(
        eq(employees.uuid, employeeUuid),
        eq(employees.companyId, companyId),
        isNull(employees.deletedAt),
      ),
    )
    .limit(1);

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }
  if (!employee.isActive) {
    throw new ValidationError('Employee is not active');
  }

  // Verify employee is assigned to the service
  const [assignment] = await db
    .select({ employeeId: employeeServices.employeeId })
    .from(employeeServices)
    .where(
      and(
        eq(employeeServices.employeeId, employee.id),
        eq(employeeServices.serviceId, serviceInternalId),
      ),
    )
    .limit(1);

  if (!assignment) {
    throw new ValidationError('Employee is not assigned to this service');
  }

  return employee;
}

async function resolveCustomerId(
  customerUuid: string,
  companyId: number,
): Promise<{ id: number; uuid: string }> {
  const [customer] = await db
    .select({ id: customers.id, uuid: customers.uuid })
    .from(customers)
    .where(and(eq(customers.uuid, customerUuid), eq(customers.companyId, companyId)))
    .limit(1);

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }
  return customer;
}

// ============================================================================
// DATE GENERATION HELPERS
// ============================================================================

/**
 * Generate occurrence dates based on repeat pattern
 * Returns array of ISO date strings (YYYY-MM-DD)
 */
function generateOccurrenceDates(
  startDate: string,
  repeatPattern: 'weekly' | 'biweekly' | 'monthly',
  endDate?: string,
  maxOccurrences?: number,
): string[] {
  const dates: string[] = [];
  const effectiveMax = maxOccurrences ?? 12; // Default 12 if neither endDate nor maxOccurrences
  const hardCap = 52; // Safety cap
  const end = endDate ? new Date(endDate + 'T23:59:59Z') : null;

  let current = new Date(startDate + 'T00:00:00Z');

  while (dates.length < Math.min(effectiveMax, hardCap)) {
    // Check if we passed the end date
    if (end && current > end) {
      break;
    }

    dates.push(current.toISOString().slice(0, 10));

    // Advance to next occurrence
    switch (repeatPattern) {
      case 'weekly':
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'biweekly':
        current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly': {
        const nextMonth = new Date(current);
        nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
        current = nextMonth;
        break;
      }
    }
  }

  return dates;
}

/**
 * Check if employee has a conflicting booking at the given time
 * Returns true if there is a conflict
 */
async function hasConflict(
  tx: Parameters<Parameters<typeof dbTx.transaction>[0]>[0],
  employeeId: number,
  companyId: number,
  startTime: Date,
  endTime: Date,
  bufferBeforeMs: number,
  bufferAfterMs: number,
  excludeBookingId?: number,
): Promise<boolean> {
  const bufferedStart = new Date(startTime.getTime() - bufferBeforeMs);
  const bufferedEnd = new Date(endTime.getTime() + bufferAfterMs);

  const conditions = [
    eq(bookings.employeeId, employeeId),
    eq(bookings.companyId, companyId),
    or(
      eq(bookings.status, 'pending'),
      eq(bookings.status, 'confirmed'),
      eq(bookings.status, 'completed'),
    ),
    lt(bookings.startTime, bufferedEnd),
    gt(bookings.endTime, bufferedStart),
  ];

  if (excludeBookingId) {
    conditions.push(sql`${bookings.id} != ${excludeBookingId}`);
  }

  const conflicting = await tx
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(...conditions))
    .limit(1);

  return conflicting.length > 0;
}

// ============================================================================
// CREATE RECURRING SERIES
// ============================================================================

/**
 * Create a recurring booking series and generate individual booking occurrences
 *
 * Flow:
 * 1. Resolve UUIDs to internal IDs
 * 2. Insert recurring_series record
 * 3. Generate occurrence dates
 * 4. For each date, check availability and create a booking
 * 5. Return series with created/skipped counts
 */
export async function createRecurringSeries(
  input: RecurringSeriesCreate,
  context: { companyId: number; userId: number },
): Promise<RecurringSeriesWithMeta> {
  const { companyId } = context;

  // 1. Resolve UUIDs to internal IDs
  const service = await resolveServiceId(input.serviceId, companyId);

  let employeeInternalId: number | null = null;
  let employeeUuid: string | null = null;
  if (input.employeeId) {
    const employee = await resolveEmployeeId(input.employeeId, companyId, service.id);
    employeeInternalId = employee.id;
    employeeUuid = employee.uuid;
  }

  const customer = await resolveCustomerId(input.customerId, companyId);

  // Determine effective max occurrences
  const effectiveMaxOccurrences = input.maxOccurrences ?? (input.endDate ? undefined : 12);

  // 2. Insert recurring_series record
  const [series] = await db
    .insert(recurringSeries)
    .values({
      companyId,
      serviceId: service.id,
      employeeId: employeeInternalId,
      customerId: customer.id,
      repeatPattern: input.repeatPattern,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      maxOccurrences: effectiveMaxOccurrences ?? null,
      notes: input.notes ?? null,
      isActive: true,
    })
    .returning();

  // 3. Generate occurrence dates
  const occurrenceDates = generateOccurrenceDates(
    input.startDate,
    input.repeatPattern,
    input.endDate,
    effectiveMaxOccurrences,
  );

  // 4. Create booking for each occurrence date (with availability check)
  let createdCount = 0;
  let skippedCount = 0;

  const bufferBeforeMs = (service.bufferBeforeMinutes ?? 0) * 60 * 1000;
  const bufferAfterMs = (service.bufferAfterMinutes ?? 0) * 60 * 1000;

  for (const dateStr of occurrenceDates) {
    // Combine date + startTime to get full datetime
    const [hour, minute] = input.startTime.split(':').map(Number);
    const occurrenceStart = new Date(dateStr + 'T00:00:00');
    occurrenceStart.setHours(hour, minute, 0, 0);
    const occurrenceEnd = new Date(occurrenceStart.getTime() + input.durationMinutes * 60 * 1000);

    try {
      await dbTx.transaction(async (tx) => {
        // Determine employee for this occurrence
        let occEmployeeId = employeeInternalId;

        if (!occEmployeeId) {
          // Auto-assign: pick first available employee for this service
          const availableEmployees = await tx
            .select({ id: employees.id, uuid: employees.uuid, name: employees.name })
            .from(employees)
            .innerJoin(employeeServices, eq(employees.id, employeeServices.employeeId))
            .where(
              and(
                eq(employees.companyId, companyId),
                eq(employees.isActive, true),
                isNull(employees.deletedAt),
                eq(employeeServices.serviceId, service.id),
              ),
            )
            .limit(1);

          if (availableEmployees.length === 0) {
            throw new ValidationError('No available employees for this service');
          }
          occEmployeeId = availableEmployees[0].id;
        }

        // Lock employee row for availability check
        await tx
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.id, occEmployeeId))
          .for('update');

        // Check for conflicts
        const conflict = await hasConflict(
          tx,
          occEmployeeId,
          companyId,
          occurrenceStart,
          occurrenceEnd,
          bufferBeforeMs,
          bufferAfterMs,
        );

        if (conflict) {
          throw new AppError('SLOT_TAKEN', `Conflict on ${dateStr}`, 409);
        }

        // Insert booking with recurringSeriesId
        const [insertedBooking] = await tx
          .insert(bookings)
          .values({
            companyId,
            customerId: customer.id,
            serviceId: service.id,
            employeeId: occEmployeeId,
            startTime: occurrenceStart,
            endTime: occurrenceEnd,
            status: 'pending',
            source: 'admin',
            notes: input.notes ?? null,
            price: service.price,
            currency: service.currency,
            discountAmount: '0',
            recurringSeriesId: series.id,
          })
          .returning();

        createdCount++;

        // Fire notifications in background (non-blocking)
        void fireBookingCreatedNotifications(insertedBooking.id, companyId, occurrenceStart);
      });
    } catch (error) {
      // If SLOT_TAKEN, skip this occurrence — don't fail the whole series
      if (error instanceof AppError && error.code === 'SLOT_TAKEN') {
        skippedCount++;
        console.warn(`[RecurringService] Skipped occurrence on ${dateStr} — slot conflict`);
        continue;
      }
      // Re-throw other errors
      throw error;
    }
  }

  // 5. Return series with counts
  return {
    id: series.uuid,
    companyId: series.companyId,
    serviceId: input.serviceId,
    employeeId: employeeUuid,
    customerId: input.customerId,
    repeatPattern: series.repeatPattern,
    startDate: series.startDate,
    endDate: series.endDate,
    startTime: series.startTime,
    durationMinutes: series.durationMinutes,
    maxOccurrences: series.maxOccurrences,
    notes: series.notes,
    isActive: series.isActive ?? true,
    createdAt: series.createdAt.toISOString(),
    updatedAt: series.updatedAt.toISOString(),
    createdOccurrences: createdCount,
    skippedOccurrences: skippedCount,
  };
}

// ============================================================================
// EDIT SINGLE OCCURRENCE
// ============================================================================

/**
 * Edit a single occurrence (booking) of a recurring series
 * Does NOT affect other occurrences or the series record
 */
export async function editSingleOccurrence(
  bookingUuid: string,
  data: { startTime?: string; employeeId?: string; notes?: string },
  companyId: number,
): Promise<ReturnType<typeof getBooking>> {
  // Find the booking by UUID
  const [bookingRecord] = await db
    .select({
      id: bookings.id,
      recurringSeriesId: bookings.recurringSeriesId,
      serviceId: bookings.serviceId,
      employeeId: bookings.employeeId,
    })
    .from(bookings)
    .where(and(eq(bookings.uuid, bookingUuid), eq(bookings.companyId, companyId)))
    .limit(1);

  if (!bookingRecord) {
    throw new NotFoundError('Booking not found');
  }

  if (!bookingRecord.recurringSeriesId) {
    throw new ValidationError('This booking is not part of a recurring series');
  }

  // Build update set
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };

  if (data.notes !== undefined) {
    updateSet.notes = data.notes;
  }

  // Handle employee change
  if (data.employeeId) {
    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.uuid, data.employeeId), eq(employees.companyId, companyId)))
      .limit(1);

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    updateSet.employeeId = employee.id;
  }

  // Handle time change — re-check availability
  if (data.startTime) {
    const newStartTime = new Date(data.startTime);

    // Get service for duration
    const [service] = await db
      .select({
        durationMinutes: services.durationMinutes,
        bufferBeforeMinutes: services.bufferBeforeMinutes,
        bufferAfterMinutes: services.bufferAfterMinutes,
      })
      .from(services)
      .where(eq(services.id, bookingRecord.serviceId))
      .limit(1);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    const newEndTime = new Date(newStartTime.getTime() + service.durationMinutes * 60 * 1000);
    const targetEmployeeId = (updateSet.employeeId as number) ?? bookingRecord.employeeId;

    if (!targetEmployeeId) {
      throw new ValidationError('Booking has no assigned employee');
    }

    await dbTx.transaction(async (tx) => {
      // Lock employee
      await tx
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.id, targetEmployeeId))
        .for('update');

      const bufferBeforeMs = (service.bufferBeforeMinutes ?? 0) * 60 * 1000;
      const bufferAfterMs = (service.bufferAfterMinutes ?? 0) * 60 * 1000;

      const conflict = await hasConflict(
        tx,
        targetEmployeeId,
        companyId,
        newStartTime,
        newEndTime,
        bufferBeforeMs,
        bufferAfterMs,
        bookingRecord.id,
      );

      if (conflict) {
        throw new AppError('SLOT_TAKEN', 'New time slot is already booked', 409);
      }

      await tx
        .update(bookings)
        .set({
          ...updateSet,
          startTime: newStartTime,
          endTime: newEndTime,
        })
        .where(eq(bookings.id, bookingRecord.id));
    });
  } else if (Object.keys(updateSet).length > 1) {
    // No time change, just update fields
    await db.update(bookings).set(updateSet).where(eq(bookings.id, bookingRecord.id));
  }

  return getBooking(bookingRecord.id, companyId);
}

// ============================================================================
// EDIT SERIES (ALL FUTURE OCCURRENCES)
// ============================================================================

/**
 * Edit series record and update all future occurrences
 * Recalculates times for future occurrences based on new settings
 */
export async function editSeries(
  seriesUuid: string,
  data: RecurringSeriesUpdate,
  companyId: number,
): Promise<RecurringSeriesWithMeta & { modifiedOccurrences: number }> {
  // 1. Find the series record
  const [series] = await db
    .select()
    .from(recurringSeries)
    .where(and(eq(recurringSeries.uuid, seriesUuid), eq(recurringSeries.companyId, companyId)))
    .limit(1);

  if (!series) {
    throw new NotFoundError('Recurring series not found');
  }

  // 2. Build update set for the series
  const seriesUpdate: Record<string, unknown> = { updatedAt: new Date() };

  if (data.repeatPattern !== undefined) seriesUpdate.repeatPattern = data.repeatPattern;
  if (data.startTime !== undefined) seriesUpdate.startTime = data.startTime;
  if (data.durationMinutes !== undefined) seriesUpdate.durationMinutes = data.durationMinutes;
  if (data.endDate !== undefined) seriesUpdate.endDate = data.endDate;
  if (data.maxOccurrences !== undefined) seriesUpdate.maxOccurrences = data.maxOccurrences;
  if (data.notes !== undefined) seriesUpdate.notes = data.notes;

  // Resolve new employee if provided
  let newEmployeeInternalId: number | undefined;
  if (data.employeeId) {
    const [employee] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.uuid, data.employeeId), eq(employees.companyId, companyId)))
      .limit(1);

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }
    newEmployeeInternalId = employee.id;
    seriesUpdate.employeeId = employee.id;
  }

  // Update series record
  await db.update(recurringSeries).set(seriesUpdate).where(eq(recurringSeries.id, series.id));

  // 3. Find all future non-cancelled occurrences
  const now = new Date();
  const futureOccurrences = await db
    .select({
      id: bookings.id,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      employeeId: bookings.employeeId,
      serviceId: bookings.serviceId,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.recurringSeriesId, series.id),
        eq(bookings.companyId, companyId),
        gt(bookings.startTime, now),
        or(eq(bookings.status, 'pending'), eq(bookings.status, 'confirmed')),
      ),
    );

  // 4. Update each future occurrence
  let modifiedCount = 0;
  const newStartTime = data.startTime ?? series.startTime;
  const newDuration = data.durationMinutes ?? series.durationMinutes;

  // Get service buffer info
  const [serviceInfo] = await db
    .select({
      bufferBeforeMinutes: services.bufferBeforeMinutes,
      bufferAfterMinutes: services.bufferAfterMinutes,
    })
    .from(services)
    .where(eq(services.id, series.serviceId))
    .limit(1);

  const bufferBeforeMs = (serviceInfo?.bufferBeforeMinutes ?? 0) * 60 * 1000;
  const bufferAfterMs = (serviceInfo?.bufferAfterMinutes ?? 0) * 60 * 1000;

  for (const occurrence of futureOccurrences) {
    try {
      const occDate = occurrence.startTime.toISOString().slice(0, 10);
      const [hour, minute] = newStartTime.split(':').map(Number);

      const updatedStart = new Date(occDate + 'T00:00:00');
      updatedStart.setHours(hour, minute, 0, 0);
      const updatedEnd = new Date(updatedStart.getTime() + newDuration * 60 * 1000);

      const targetEmployeeId = newEmployeeInternalId ?? occurrence.employeeId;

      if (!targetEmployeeId) {
        console.warn(`[RecurringService] Skipping occurrence ${occurrence.id} — no employee`);
        continue;
      }

      // Check availability for updated time (within transaction)
      await dbTx.transaction(async (tx) => {
        await tx
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.id, targetEmployeeId))
          .for('update');

        const conflict = await hasConflict(
          tx,
          targetEmployeeId,
          companyId,
          updatedStart,
          updatedEnd,
          bufferBeforeMs,
          bufferAfterMs,
          occurrence.id,
        );

        if (conflict) {
          throw new AppError('SLOT_TAKEN', `Conflict for occurrence on ${occDate}`, 409);
        }

        await tx
          .update(bookings)
          .set({
            startTime: updatedStart,
            endTime: updatedEnd,
            employeeId: targetEmployeeId,
            notes: data.notes !== undefined ? data.notes : undefined,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, occurrence.id));
      });

      modifiedCount++;
    } catch (error) {
      if (error instanceof AppError && error.code === 'SLOT_TAKEN') {
        console.warn(`[RecurringService] Skipped editing occurrence ${occurrence.id} — conflict`);
        continue;
      }
      throw error;
    }
  }

  // 5. Fetch updated series for response
  const [updatedSeries] = await db
    .select()
    .from(recurringSeries)
    .where(eq(recurringSeries.id, series.id))
    .limit(1);

  // Count total occurrences
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.recurringSeriesId, series.id),
        eq(bookings.companyId, companyId),
        isNull(bookings.deletedAt),
      ),
    );

  // Resolve UUIDs for response
  const [serviceRecord] = await db
    .select({ uuid: services.uuid })
    .from(services)
    .where(eq(services.id, updatedSeries.serviceId))
    .limit(1);

  const [customerRecord] = await db
    .select({ uuid: customers.uuid })
    .from(customers)
    .where(eq(customers.id, updatedSeries.customerId))
    .limit(1);

  let employeeUuid: string | null = null;
  if (updatedSeries.employeeId) {
    const [emp] = await db
      .select({ uuid: employees.uuid })
      .from(employees)
      .where(eq(employees.id, updatedSeries.employeeId))
      .limit(1);
    employeeUuid = emp?.uuid ?? null;
  }

  return {
    id: updatedSeries.uuid,
    companyId: updatedSeries.companyId,
    serviceId: serviceRecord?.uuid ?? '',
    employeeId: employeeUuid,
    customerId: customerRecord?.uuid ?? '',
    repeatPattern: updatedSeries.repeatPattern,
    startDate: updatedSeries.startDate,
    endDate: updatedSeries.endDate,
    startTime: updatedSeries.startTime,
    durationMinutes: updatedSeries.durationMinutes,
    maxOccurrences: updatedSeries.maxOccurrences,
    notes: updatedSeries.notes,
    isActive: updatedSeries.isActive ?? true,
    createdAt: updatedSeries.createdAt.toISOString(),
    updatedAt: updatedSeries.updatedAt.toISOString(),
    occurrenceCount: countResult?.count ?? 0,
    modifiedOccurrences: modifiedCount,
  };
}

// ============================================================================
// CANCEL SINGLE OCCURRENCE
// ============================================================================

/**
 * Cancel a single occurrence of a recurring series
 * Uses booking-transitions.ts cancelBooking for proper state machine + events
 */
export async function cancelOccurrence(
  bookingUuid: string,
  companyId: number,
  cancelContext: { userId: number; userRole: string; reason?: string },
): Promise<ReturnType<typeof getBooking>> {
  // Find the booking
  const [bookingRecord] = await db
    .select({ id: bookings.id, recurringSeriesId: bookings.recurringSeriesId })
    .from(bookings)
    .where(and(eq(bookings.uuid, bookingUuid), eq(bookings.companyId, companyId)))
    .limit(1);

  if (!bookingRecord) {
    throw new NotFoundError('Booking not found');
  }

  if (!bookingRecord.recurringSeriesId) {
    throw new ValidationError('This booking is not part of a recurring series');
  }

  // Delegate to booking-transitions cancelBooking
  return cancelBooking(
    bookingRecord.id,
    { reason: cancelContext.reason },
    {
      companyId,
      userId: cancelContext.userId,
      userRole: cancelContext.userRole,
    },
  );
}

// ============================================================================
// CANCEL SERIES (ALL FUTURE OCCURRENCES)
// ============================================================================

/**
 * Cancel entire series: deactivate series record + cancel all future occurrences
 * Uses booking-transitions.ts cancelBooking for each occurrence
 */
export async function cancelSeries(
  seriesUuid: string,
  companyId: number,
  cancelContext: { userId: number; userRole: string; reason?: string },
): Promise<{ cancelledCount: number }> {
  // 1. Find the series
  const [series] = await db
    .select({ id: recurringSeries.id })
    .from(recurringSeries)
    .where(and(eq(recurringSeries.uuid, seriesUuid), eq(recurringSeries.companyId, companyId)))
    .limit(1);

  if (!series) {
    throw new NotFoundError('Recurring series not found');
  }

  // 2. Deactivate the series
  await db
    .update(recurringSeries)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(recurringSeries.id, series.id));

  // 3. Find all future non-cancelled occurrences
  const now = new Date();
  const futureOccurrences = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.recurringSeriesId, series.id),
        eq(bookings.companyId, companyId),
        gt(bookings.startTime, now),
        or(eq(bookings.status, 'pending'), eq(bookings.status, 'confirmed')),
      ),
    );

  // 4. Cancel each occurrence
  let cancelledCount = 0;
  for (const occurrence of futureOccurrences) {
    try {
      await cancelBooking(
        occurrence.id,
        { reason: cancelContext.reason ?? 'Series cancelled' },
        {
          companyId,
          userId: cancelContext.userId,
          userRole: cancelContext.userRole,
        },
      );
      cancelledCount++;
    } catch (error) {
      // If already cancelled or in terminal state, skip
      console.warn(`[RecurringService] Could not cancel occurrence ${occurrence.id}:`, error);
    }
  }

  return { cancelledCount };
}

// ============================================================================
// GET RECURRING SERIES
// ============================================================================

/**
 * Fetch a single recurring series by UUID with occurrence count
 */
export async function getRecurringSeries(
  seriesUuid: string,
  companyId: number,
): Promise<RecurringSeriesWithMeta> {
  const [series] = await db
    .select()
    .from(recurringSeries)
    .where(and(eq(recurringSeries.uuid, seriesUuid), eq(recurringSeries.companyId, companyId)))
    .limit(1);

  if (!series) {
    throw new NotFoundError('Recurring series not found');
  }

  // Count occurrences
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.recurringSeriesId, series.id),
        eq(bookings.companyId, companyId),
        isNull(bookings.deletedAt),
      ),
    );

  // Resolve UUIDs
  const [serviceRecord] = await db
    .select({ uuid: services.uuid })
    .from(services)
    .where(eq(services.id, series.serviceId))
    .limit(1);

  const [customerRecord] = await db
    .select({ uuid: customers.uuid })
    .from(customers)
    .where(eq(customers.id, series.customerId))
    .limit(1);

  let employeeUuid: string | null = null;
  if (series.employeeId) {
    const [emp] = await db
      .select({ uuid: employees.uuid })
      .from(employees)
      .where(eq(employees.id, series.employeeId))
      .limit(1);
    employeeUuid = emp?.uuid ?? null;
  }

  return {
    id: series.uuid,
    companyId: series.companyId,
    serviceId: serviceRecord?.uuid ?? '',
    employeeId: employeeUuid,
    customerId: customerRecord?.uuid ?? '',
    repeatPattern: series.repeatPattern,
    startDate: series.startDate,
    endDate: series.endDate,
    startTime: series.startTime,
    durationMinutes: series.durationMinutes,
    maxOccurrences: series.maxOccurrences,
    notes: series.notes,
    isActive: series.isActive ?? true,
    createdAt: series.createdAt.toISOString(),
    updatedAt: series.updatedAt.toISOString(),
    occurrenceCount: countResult?.count ?? 0,
  };
}

// ============================================================================
// LIST RECURRING SERIES
// ============================================================================

/**
 * List recurring series with pagination
 */
export async function listRecurringSeries(
  companyId: number,
  query: { page?: number; limit?: number; isActive?: boolean },
): Promise<{ data: RecurringSeriesWithMeta[]; meta: PaginationMeta }> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(recurringSeries.companyId, companyId)];
  if (query.isActive !== undefined) {
    conditions.push(eq(recurringSeries.isActive, query.isActive));
  }

  // Fetch series
  const rows = await db
    .select()
    .from(recurringSeries)
    .where(and(...conditions))
    .orderBy(recurringSeries.createdAt)
    .limit(limit)
    .offset(offset);

  // Count total
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recurringSeries)
    .where(and(...conditions));

  const totalCount = countResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Enrich each row with UUIDs and occurrence counts
  const data: RecurringSeriesWithMeta[] = await Promise.all(
    rows.map(async (series) => {
      // Count occurrences for this series
      const [occCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(
          and(
            eq(bookings.recurringSeriesId, series.id),
            eq(bookings.companyId, companyId),
            isNull(bookings.deletedAt),
          ),
        );

      // Resolve UUIDs
      const [serviceRecord] = await db
        .select({ uuid: services.uuid })
        .from(services)
        .where(eq(services.id, series.serviceId))
        .limit(1);

      const [customerRecord] = await db
        .select({ uuid: customers.uuid })
        .from(customers)
        .where(eq(customers.id, series.customerId))
        .limit(1);

      let employeeUuid: string | null = null;
      if (series.employeeId) {
        const [emp] = await db
          .select({ uuid: employees.uuid })
          .from(employees)
          .where(eq(employees.id, series.employeeId))
          .limit(1);
        employeeUuid = emp?.uuid ?? null;
      }

      return {
        id: series.uuid,
        companyId: series.companyId,
        serviceId: serviceRecord?.uuid ?? '',
        employeeId: employeeUuid,
        customerId: customerRecord?.uuid ?? '',
        repeatPattern: series.repeatPattern,
        startDate: series.startDate,
        endDate: series.endDate,
        startTime: series.startTime,
        durationMinutes: series.durationMinutes,
        maxOccurrences: series.maxOccurrences,
        notes: series.notes,
        isActive: series.isActive ?? true,
        createdAt: series.createdAt.toISOString(),
        updatedAt: series.updatedAt.toISOString(),
        occurrenceCount: occCount?.count ?? 0,
      };
    }),
  );

  return {
    data,
    meta: {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
    },
  };
}
