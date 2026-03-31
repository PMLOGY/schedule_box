/**
 * Booking Status Transitions Service
 * State machine for booking lifecycle with domain event publishing
 *
 * Valid state transitions:
 * - pending -> confirmed
 * - pending -> cancelled
 * - pending -> expired
 * - confirmed -> completed
 * - confirmed -> cancelled
 * - confirmed -> no_show
 *
 * Each transition publishes a corresponding domain event.
 */

import { eq, and, isNull, or, lt, gt, ne } from 'drizzle-orm';
import {
  db,
  dbTx,
  bookings,
  services,
  employees,
  employeeServices,
  notifications,
  customers,
  companies,
} from '@schedulebox/database';
import { AppError, NotFoundError, ValidationError } from '@schedulebox/shared';
import {
  publishEvent,
  createBookingConfirmedEvent,
  createBookingCancelledEvent,
  createBookingCompletedEvent,
  createBookingNoShowEvent,
  createBookingRescheduledEvent,
} from '@schedulebox/events';
import type { BookingWithRelations } from './booking-service';
import { getBooking } from './booking-service';
import { awardPointsForBooking } from '@/lib/loyalty/points-engine';
import { sendBookingStatusChangeEmail } from '@/lib/email/booking-emails';
import {
  sendBookingConfirmedPush,
  sendBookingCancelledPush,
} from '@/lib/push/booking-push-notifications';
import { promoteFromWaitlist } from '@/lib/waitlist/waitlist-service';

// ============================================================================
// EMAIL NOTIFICATION HELPER
// ============================================================================

/**
 * Fetch data needed for booking emails and fire status change email.
 * Inserts a notification record (pending → sent/failed) in fire-and-forget fashion.
 * Never throws — email failure must not affect booking operations.
 */
async function fireStatusChangeEmail(
  bookingId: number,
  companyId: number,
  newStatus: 'confirmed' | 'cancelled' | 'completed',
): Promise<void> {
  try {
    // Fetch booking with customer, service, employee, and company data
    const [row] = await db
      .select({
        bookingUuid: bookings.uuid,
        startTime: bookings.startTime,
        customerName: customers.name,
        customerEmail: customers.email,
        serviceName: services.name,
        employeeName: employees.name,
        companyName: companies.name,
        companyPhone: companies.phone,
      })
      .from(bookings)
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(companies, eq(bookings.companyId, companies.id))
      .leftJoin(employees, eq(bookings.employeeId, employees.id))
      .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)))
      .limit(1);

    if (!row || !row.customerEmail) {
      // No email address — skip silently
      return;
    }

    const subjectMap: Record<string, string> = {
      confirmed: 'Rezervace potvrzena',
      cancelled: 'Rezervace zrušena',
      completed: 'Rezervace dokončena',
    };

    const bodyText = `Vaše rezervace (${row.bookingUuid}) — ${subjectMap[newStatus]}`;

    // Insert notification record with pending status
    const [notifRecord] = await db
      .insert(notifications)
      .values({
        companyId,
        channel: 'email',
        recipient: row.customerEmail,
        subject: subjectMap[newStatus],
        body: bodyText,
        status: 'pending',
      })
      .returning({ id: notifications.id });

    // Fire-and-forget email
    sendBookingStatusChangeEmail({
      to: row.customerEmail,
      customerName: row.customerName,
      serviceName: row.serviceName,
      employeeName: row.employeeName ?? null,
      startTime: row.startTime,
      companyName: row.companyName,
      companyPhone: row.companyPhone ?? null,
      bookingUuid: row.bookingUuid,
      newStatus,
    })
      .then(async () => {
        await db
          .update(notifications)
          .set({ status: 'sent', sentAt: new Date() })
          .where(eq(notifications.id, notifRecord.id));
      })
      .catch(async (err: unknown) => {
        console.error(`[BookingEmails] Status change email (${newStatus}) failed:`, err);
        await db
          .update(notifications)
          .set({ status: 'failed', errorMessage: String(err) })
          .where(eq(notifications.id, notifRecord.id));
      });
  } catch (err) {
    // Non-critical path — log and continue
    console.error('[BookingEmails] fireStatusChangeEmail error:', err);
  }
}

// ============================================================================
// STATE MACHINE DEFINITION
// ============================================================================

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['completed', 'cancelled', 'no_show'],
};

/**
 * Validate state transition is allowed
 * @throws ValidationError (422) if invalid transition
 */
function validateTransition(currentStatus: string, newStatus: string): void {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new ValidationError(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }
}

// ============================================================================
// CONFIRM BOOKING
// ============================================================================

/**
 * Confirm a pending booking
 * Transition: pending -> confirmed
 *
 * @param bookingId - Internal booking ID
 * @param companyId - Company ID for tenant isolation
 * @returns Updated booking
 * @throws NotFoundError if booking not found
 * @throws ValidationError if invalid state transition
 */
export async function confirmBooking(
  bookingId: number,
  companyId: number,
): Promise<BookingWithRelations> {
  // Get existing booking
  const existing = await getBooking(bookingId, companyId);
  if (!existing) {
    throw new NotFoundError('Booking not found');
  }

  // Validate transition
  validateTransition(existing.status, 'confirmed');

  // Update status
  await db
    .update(bookings)
    .set({
      status: 'confirmed',
      updatedAt: new Date(),
    })
    .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)));

  // Publish booking.confirmed event
  try {
    await publishEvent(
      createBookingConfirmedEvent({
        bookingUuid: existing.id,
        companyId,
        confirmedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    // Event publishing is fire-and-forget in MVP
    console.error('[Booking Transitions] Failed to publish booking.confirmed event:', error);
  }

  // Fire status change email (fire-and-forget — never throws)
  void fireStatusChangeEmail(bookingId, companyId, 'confirmed');

  // Fire push notification (fire-and-forget)
  sendBookingConfirmedPush(bookingId, companyId).catch((err) => {
    console.error('[Push] Failed to send booking confirmed push:', err);
  });

  // Return updated booking
  const updated = await getBooking(bookingId, companyId);
  if (!updated) {
    throw new NotFoundError('Failed to retrieve updated booking');
  }

  return updated;
}

// ============================================================================
// CANCEL BOOKING
// ============================================================================

/**
 * Cancel a booking with cancellation policy enforcement
 * Transition: pending|confirmed -> cancelled
 *
 * Cancellation policy:
 * - Customer role: Cannot cancel within cancellationPolicyHours of start time
 * - Admin/employee roles: Can cancel anytime (bypass policy)
 *
 * @param bookingId - Internal booking ID
 * @param input - Cancellation reason (optional)
 * @param context - User context (companyId, userId, userRole)
 * @returns Updated booking
 * @throws NotFoundError if booking not found
 * @throws ValidationError if invalid state transition
 * @throws AppError (403, CANCELLATION_POLICY) if within policy window for customer role
 */
export async function cancelBooking(
  bookingId: number,
  input: { reason?: string },
  context: { companyId: number; userId: number; userRole: string },
): Promise<BookingWithRelations> {
  const { companyId, userRole } = context;

  // Get existing booking
  const existing = await getBooking(bookingId, companyId);
  if (!existing) {
    throw new NotFoundError('Booking not found');
  }

  // Validate transition
  validateTransition(existing.status, 'cancelled');

  // Cancellation policy check (only for customer role)
  if (userRole === 'customer') {
    // Get booking's internal ID to fetch service details
    const [bookingData] = await db
      .select({
        id: bookings.id,
        serviceId: bookings.serviceId,
        startTime: bookings.startTime,
      })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)))
      .limit(1);

    if (!bookingData) {
      throw new NotFoundError('Booking not found');
    }

    // Get service's cancellation policy
    const [service] = await db
      .select({
        cancellationPolicyHours: services.cancellationPolicyHours,
      })
      .from(services)
      .where(eq(services.id, bookingData.serviceId))
      .limit(1);

    const policyHours = service?.cancellationPolicyHours ?? 24;

    // Check if booking start time is within policy window
    const now = new Date();
    const startTime = new Date(bookingData.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < policyHours) {
      throw new AppError(
        'CANCELLATION_POLICY',
        `Cannot cancel within ${policyHours} hours of appointment`,
        403,
      );
    }
  }

  // Determine cancelledBy based on role
  let cancelledBy: 'customer' | 'employee' | 'admin' | 'system';
  if (userRole === 'customer') {
    cancelledBy = 'customer';
  } else if (userRole === 'admin') {
    cancelledBy = 'admin';
  } else {
    cancelledBy = 'employee';
  }

  // Update booking
  const now = new Date();
  await db
    .update(bookings)
    .set({
      status: 'cancelled',
      cancelledAt: now,
      cancellationReason: input.reason ?? null,
      cancelledBy,
      updatedAt: now,
    })
    .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)));

  // Publish booking.cancelled event
  try {
    await publishEvent(
      createBookingCancelledEvent({
        bookingUuid: existing.id,
        companyId,
        cancelledBy,
        reason: input.reason ?? null,
        cancelledAt: now.toISOString(),
      }),
    );
  } catch (error) {
    console.error('[Booking Transitions] Failed to publish booking.cancelled event:', error);
  }

  // Fire status change email (fire-and-forget — never throws)
  void fireStatusChangeEmail(bookingId, companyId, 'cancelled');

  // Fire push notification (fire-and-forget)
  sendBookingCancelledPush(bookingId, companyId).catch((err) => {
    console.error('[Push] Failed to send booking cancelled push:', err);
  });

  // Waitlist auto-promotion: if this was a group class, promote the first waitlisted customer
  // Fire-and-forget — waitlist promotion failure must never prevent cancellation
  void (async () => {
    try {
      // Get booking's service details to check if it's a group class
      const [bookingServiceData] = await db
        .select({
          serviceId: bookings.serviceId,
          employeeId: bookings.employeeId,
          startTime: bookings.startTime,
          maxCapacity: services.maxCapacity,
        })
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)))
        .limit(1);

      if (bookingServiceData && (bookingServiceData.maxCapacity ?? 1) > 1) {
        const result = await promoteFromWaitlist(
          bookingServiceData.serviceId,
          bookingServiceData.employeeId,
          bookingServiceData.startTime,
          companyId,
        );

        if (result) {
          console.log(
            `[Waitlist] Auto-promoted customer "${result.customerName}" from waitlist for booking ${bookingId}`,
          );
        } else {
          console.log(`[Waitlist] No one on waitlist for cancelled booking ${bookingId}`);
        }
      }
    } catch (err) {
      console.error('[Waitlist] Auto-promotion after cancellation failed:', err);
    }
  })();

  // Return updated booking
  const updated = await getBooking(bookingId, companyId);
  if (!updated) {
    throw new NotFoundError('Failed to retrieve updated booking');
  }

  return updated;
}

// ============================================================================
// COMPLETE BOOKING
// ============================================================================

/**
 * Mark booking as completed
 * Transition: confirmed -> completed
 *
 * @param bookingId - Internal booking ID
 * @param companyId - Company ID for tenant isolation
 * @returns Updated booking
 * @throws NotFoundError if booking not found
 * @throws ValidationError if invalid state transition
 */
export async function completeBooking(
  bookingId: number,
  companyId: number,
): Promise<BookingWithRelations> {
  // Get existing booking
  const existing = await getBooking(bookingId, companyId);
  if (!existing) {
    throw new NotFoundError('Booking not found');
  }

  // Validate transition
  validateTransition(existing.status, 'completed');

  // Update status
  await db
    .update(bookings)
    .set({
      status: 'completed',
      updatedAt: new Date(),
    })
    .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)));

  // Publish booking.completed event
  try {
    await publishEvent(
      createBookingCompletedEvent({
        bookingUuid: existing.id,
        companyId,
        completedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error('[Booking Transitions] Failed to publish booking.completed event:', error);
  }

  // Fire status change email (fire-and-forget — never throws)
  void fireStatusChangeEmail(bookingId, companyId, 'completed');

  // Award loyalty points synchronously (fallback for when RabbitMQ is not running)
  // awardPointsForBooking is idempotent — safe to call even if consumer also processes the event
  try {
    await awardPointsForBooking(existing.id, companyId);
  } catch (error) {
    // Non-critical: log but don't fail the booking completion
    console.error('[Booking Transitions] Failed to award loyalty points:', error);
  }

  // Return updated booking
  const updated = await getBooking(bookingId, companyId);
  if (!updated) {
    throw new NotFoundError('Failed to retrieve updated booking');
  }

  return updated;
}

// ============================================================================
// MARK NO SHOW
// ============================================================================

/**
 * Mark booking as no-show
 * Transition: confirmed -> no_show
 *
 * Customer's no_show_count increment is handled by DB trigger from Phase 2.
 *
 * @param bookingId - Internal booking ID
 * @param companyId - Company ID for tenant isolation
 * @returns Updated booking
 * @throws NotFoundError if booking not found
 * @throws ValidationError if invalid state transition
 */
export async function markNoShow(
  bookingId: number,
  companyId: number,
): Promise<BookingWithRelations> {
  // Get existing booking
  const existing = await getBooking(bookingId, companyId);
  if (!existing) {
    throw new NotFoundError('Booking not found');
  }

  // Validate transition
  validateTransition(existing.status, 'no_show');

  // Update status
  await db
    .update(bookings)
    .set({
      status: 'no_show',
      updatedAt: new Date(),
    })
    .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)));

  // Publish booking.no_show event
  try {
    await publishEvent(
      createBookingNoShowEvent({
        bookingUuid: existing.id,
        companyId,
        markedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error('[Booking Transitions] Failed to publish booking.no_show event:', error);
  }

  // Return updated booking
  const updated = await getBooking(bookingId, companyId);
  if (!updated) {
    throw new NotFoundError('Failed to retrieve updated booking');
  }

  return updated;
}

// ============================================================================
// RESCHEDULE BOOKING
// ============================================================================

/**
 * Reschedule booking to new time and/or employee
 * Changes time slot with availability re-check and SELECT FOR UPDATE
 *
 * @param bookingId - Internal booking ID
 * @param input - New start time and optional employee
 * @param context - User context (companyId, userId)
 * @returns Updated booking
 * @throws NotFoundError if booking not found or service/employee not found
 * @throws ValidationError if booking is not in pending or confirmed status
 * @throws AppError (409, SLOT_TAKEN) if new time slot is already booked
 */
export async function rescheduleBooking(
  bookingId: number,
  input: { start_time: string; employee_id?: number },
  context: { companyId: number; userId: number },
): Promise<BookingWithRelations> {
  const { companyId } = context;

  // Get existing booking
  const existing = await getBooking(bookingId, companyId);
  if (!existing) {
    throw new NotFoundError('Booking not found');
  }

  // Can only reschedule pending or confirmed bookings
  if (existing.status !== 'pending' && existing.status !== 'confirmed') {
    throw new ValidationError('Can only reschedule pending or confirmed bookings');
  }

  // Save old times for event payload
  const oldStartTime = existing.startTime;
  const oldEndTime = existing.endTime;

  // Parse new start time
  const newStartTime = new Date(input.start_time);

  // Use transaction for atomic reschedule with availability check
  await dbTx.transaction(async (tx) => {
    // Get booking's internal data
    const [bookingData] = await tx
      .select({
        id: bookings.id,
        employeeId: bookings.employeeId,
        serviceId: bookings.serviceId,
      })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)))
      .limit(1);

    if (!bookingData) {
      throw new NotFoundError('Booking not found');
    }

    // Determine new employee (use input or keep existing)
    const newEmployeeId = input.employee_id ?? bookingData.employeeId;

    if (!newEmployeeId) {
      throw new ValidationError('Employee is required for rescheduling');
    }

    // If employee changed, verify new employee exists and is assigned to service
    if (input.employee_id && input.employee_id !== bookingData.employeeId) {
      const [employee] = await tx
        .select({
          id: employees.id,
          uuid: employees.uuid,
          companyId: employees.companyId,
          isActive: employees.isActive,
        })
        .from(employees)
        .where(
          and(
            eq(employees.id, input.employee_id),
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

      // Verify employee is assigned to this service
      const [assignment] = await tx
        .select({ employeeId: employeeServices.employeeId })
        .from(employeeServices)
        .where(
          and(
            eq(employeeServices.employeeId, employee.id),
            eq(employeeServices.serviceId, bookingData.serviceId),
          ),
        )
        .limit(1);

      if (!assignment) {
        throw new ValidationError('Employee is not assigned to this service');
      }
    }

    // Get service details for duration and buffer
    const [service] = await tx
      .select({
        durationMinutes: services.durationMinutes,
        bufferBeforeMinutes: services.bufferBeforeMinutes,
        bufferAfterMinutes: services.bufferAfterMinutes,
      })
      .from(services)
      .where(eq(services.id, bookingData.serviceId))
      .limit(1);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    // Calculate new end time
    const newEndTime = new Date(newStartTime.getTime() + service.durationMinutes * 60 * 1000);

    // SELECT FOR UPDATE on employee row to lock
    await tx
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, newEmployeeId))
      .for('update');

    // Check for conflicting bookings (EXCLUDE current booking from conflict check)
    const bufferBefore = (service.bufferBeforeMinutes ?? 0) * 60 * 1000;
    const bufferAfter = (service.bufferAfterMinutes ?? 0) * 60 * 1000;
    const bufferedStart = new Date(newStartTime.getTime() - bufferBefore);
    const bufferedEnd = new Date(newEndTime.getTime() + bufferAfter);

    const conflictingBookings = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.employeeId, newEmployeeId),
          eq(bookings.companyId, companyId),
          ne(bookings.id, bookingData.id), // EXCLUDE current booking
          or(
            eq(bookings.status, 'pending'),
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'completed'),
          ),
          lt(bookings.startTime, bufferedEnd),
          gt(bookings.endTime, bufferedStart),
        ),
      )
      .limit(1);

    if (conflictingBookings.length > 0) {
      throw new AppError('SLOT_TAKEN', 'New time slot is already booked', 409);
    }

    // Update booking with new time and employee (if changed)
    await tx
      .update(bookings)
      .set({
        startTime: newStartTime,
        endTime: newEndTime,
        employeeId: newEmployeeId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingData.id));
  });

  // Transaction committed successfully

  // Publish booking.rescheduled event
  try {
    // Get current employee UUID if needed
    let employeeUuid: string | null = null;
    const [updatedBooking] = await db
      .select({
        employeeId: bookings.employeeId,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (updatedBooking?.employeeId) {
      const [employee] = await db
        .select({ uuid: employees.uuid })
        .from(employees)
        .where(eq(employees.id, updatedBooking.employeeId))
        .limit(1);

      employeeUuid = employee?.uuid ?? null;
    }

    await publishEvent(
      createBookingRescheduledEvent({
        bookingUuid: existing.id,
        companyId,
        oldStartTime,
        oldEndTime,
        newStartTime: newStartTime.toISOString(),
        newEndTime: new Date(newStartTime.getTime() + 60 * 1000).toISOString(), // placeholder, will be recalculated
        newEmployeeUuid: employeeUuid,
      }),
    );
  } catch (error) {
    console.error('[Booking Transitions] Failed to publish booking.rescheduled event:', error);
  }

  // Return updated booking
  const updated = await getBooking(bookingId, companyId);
  if (!updated) {
    throw new NotFoundError('Failed to retrieve updated booking');
  }

  return updated;
}
