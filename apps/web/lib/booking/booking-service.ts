/**
 * Booking Service Layer
 * Business logic for booking CRUD operations with double-booking prevention
 *
 * Double-booking prevention strategy:
 * 1. SELECT FOR UPDATE on employee row (locks employee for duration of transaction)
 * 2. Re-check availability within transaction (accounts for concurrent transactions)
 * 3. btree_gist exclusion constraint as safety net (database-level enforcement)
 */

import { eq, and, isNull, or, gte, lt, gt, sql } from 'drizzle-orm';
import {
  db,
  dbTx,
  bookings,
  bookingResources,
  services,
  employees,
  employeeServices,
  customers,
  notifications,
  companies,
} from '@schedulebox/database';
import { AppError, NotFoundError, ValidationError, type PaginationMeta } from '@schedulebox/shared';
import { publishEvent, createBookingCreatedEvent } from '@schedulebox/events';
import type { BookingCreate, BookingUpdate, BookingListQuery } from '@schedulebox/shared';
import { sendBookingConfirmationEmail } from '@/lib/email/booking-emails';
import { sendBookingCreatedPush } from '@/lib/push/booking-push-notifications';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Booking with joined customer, service, and employee data
 */
export interface BookingWithRelations {
  id: string; // UUID for API response
  companyId: string; // UUID
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: string;
  };
  employee: {
    id: string;
    name: string;
  } | null;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  source: 'online' | 'admin' | 'phone' | 'walk_in' | 'voice_ai' | 'marketplace' | 'api' | 'widget';
  notes: string | null;
  internalNotes: string | null;
  price: string;
  currency: string;
  discountAmount: string;
  noShowProbability: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledBy: 'customer' | 'employee' | 'admin' | 'system' | null;
  createdAt: string;
  updatedAt: string;
  bookingMetadata?: Record<string, unknown> | null;
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Fire confirmation email and create SMS reminder notification row.
 * Called after booking creation — entirely fire-and-forget, never throws.
 */
export async function fireBookingCreatedNotifications(
  bookingId: number,
  companyId: number,
  startTime: Date,
): Promise<void> {
  try {
    // Fetch booking with customer, service, employee, and company data
    const [row] = await db
      .select({
        bookingUuid: bookings.uuid,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        serviceName: services.name,
        employeeName: employees.name,
        companyName: companies.name,
        companyPhone: companies.phone,
        customMeetingUrl: companies.customMeetingUrl,
      })
      .from(bookings)
      .innerJoin(customers, eq(bookings.customerId, customers.id))
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(companies, eq(bookings.companyId, companies.id))
      .leftJoin(employees, eq(bookings.employeeId, employees.id))
      .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)))
      .limit(1);

    if (!row) return;

    // --- Email confirmation ---
    if (row.customerEmail) {
      const bodyText = `Potvrzení rezervace (${row.bookingUuid}) u ${row.companyName}`;

      const [notifRecord] = await db
        .insert(notifications)
        .values({
          companyId,
          bookingId,
          channel: 'email',
          recipient: row.customerEmail,
          subject: 'Potvrzení rezervace',
          body: bodyText,
          status: 'pending',
        })
        .returning({ id: notifications.id });

      sendBookingConfirmationEmail({
        to: row.customerEmail,
        customerName: row.customerName,
        serviceName: row.serviceName,
        employeeName: row.employeeName ?? null,
        startTime,
        companyName: row.companyName,
        companyPhone: row.companyPhone ?? null,
        bookingUuid: row.bookingUuid,
        meetingUrl: row.customMeetingUrl ?? null,
      })
        .then(async () => {
          await db
            .update(notifications)
            .set({ status: 'sent', sentAt: new Date() })
            .where(eq(notifications.id, notifRecord.id));
        })
        .catch(async (err: unknown) => {
          console.error('[BookingEmails] Confirmation email failed:', err);
          await db
            .update(notifications)
            .set({ status: 'failed', errorMessage: String(err) })
            .where(eq(notifications.id, notifRecord.id));
        });
    }

    // --- SMS reminder row (picked up by cron job 24h before) ---
    if (row.customerPhone) {
      const scheduledAt = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
      const smsBody = `Připomínka: Vaše rezervace (${row.serviceName}) u ${row.companyName} je ${startTime.toLocaleString('cs-CZ')}.`;

      await db.insert(notifications).values({
        companyId,
        bookingId,
        channel: 'sms',
        recipient: row.customerPhone,
        subject: null,
        body: smsBody,
        status: 'pending',
        scheduledAt,
      });
    }

    // --- Push notification (fire-and-forget) ---
    sendBookingCreatedPush(bookingId, companyId).catch((err) => {
      console.error('[Push] Failed to send booking created push:', err);
    });
  } catch (err) {
    // Non-critical path — log and continue
    console.error('[BookingNotifications] fireBookingCreatedNotifications error:', err);
  }
}

// ============================================================================
// CREATE BOOKING
// ============================================================================

/**
 * Create a new booking with double-booking prevention
 *
 * Transaction flow:
 * 1. Fetch and validate service
 * 2. Calculate end time from service duration
 * 3. Select or auto-assign employee
 * 4. Lock employee row with SELECT FOR UPDATE
 * 5. Re-check availability within transaction
 * 6. Insert booking
 * 7. Insert resource associations (if provided)
 *
 * After transaction commits:
 * 8. Publish booking.created domain event
 *
 * @throws NotFoundError if service or employee not found
 * @throws ValidationError if service is inactive or employee not assigned to service
 * @throws ConflictError (409) if time slot is already taken (code: SLOT_TAKEN)
 */
export async function createBooking(
  input: BookingCreate,
  context: { companyId: number; userId: number },
): Promise<BookingWithRelations> {
  const { companyId } = context;

  // Parse start time to Date
  const startTime = new Date(input.start_time);

  // Use dbTx.transaction for atomic operations with SELECT FOR UPDATE (WebSocket Pool required)
  const booking = await dbTx.transaction(async (tx) => {
    // 1. Fetch service and validate
    const [service] = await tx
      .select({
        id: services.id,
        uuid: services.uuid,
        companyId: services.companyId,
        name: services.name,
        durationMinutes: services.durationMinutes,
        bufferBeforeMinutes: services.bufferBeforeMinutes,
        bufferAfterMinutes: services.bufferAfterMinutes,
        price: services.price,
        currency: services.currency,
        isActive: services.isActive,
      })
      .from(services)
      .where(and(eq(services.id, input.service_id), eq(services.companyId, companyId)))
      .limit(1);

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (!service.isActive) {
      throw new ValidationError('Service is not active');
    }

    // 2. Calculate end time from start time + duration
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60 * 1000);

    // 3. Determine employee (provided or auto-assign)
    let employeeId: number;
    let employeeUuid: string;
    let employeeName: string;

    if (input.employee_id) {
      // Verify provided employee exists, is active, belongs to company, and is assigned to this service
      const [employee] = await tx
        .select({
          id: employees.id,
          uuid: employees.uuid,
          companyId: employees.companyId,
          name: employees.name,
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
            eq(employeeServices.serviceId, service.id),
          ),
        )
        .limit(1);

      if (!assignment) {
        throw new ValidationError('Employee is not assigned to this service');
      }

      employeeId = employee.id;
      employeeUuid = employee.uuid;
      employeeName = employee.name;
    } else {
      // Auto-assign: pick first available employee for this service
      const availableEmployees = await tx
        .select({
          id: employees.id,
          uuid: employees.uuid,
          name: employees.name,
        })
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

      const firstEmployee = availableEmployees[0];
      employeeId = firstEmployee.id;
      employeeUuid = firstEmployee.uuid;
      employeeName = firstEmployee.name;
    }

    // 4. SELECT FOR UPDATE on employee row to lock for this transaction
    // This prevents concurrent bookings from proceeding until we commit/rollback
    await tx
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .for('update');

    // 5. Re-check availability within transaction
    // Check if employee has any overlapping bookings (including buffer time)
    // Buffer expansion: [startTime - bufferBefore, endTime + bufferAfter]
    const bufferBefore = (service.bufferBeforeMinutes ?? 0) * 60 * 1000;
    const bufferAfter = (service.bufferAfterMinutes ?? 0) * 60 * 1000;
    const bufferedStart = new Date(startTime.getTime() - bufferBefore);
    const bufferedEnd = new Date(endTime.getTime() + bufferAfter);

    // Query for overlapping bookings (non-cancelled, non-expired)
    const conflictingBookings = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.employeeId, employeeId),
          eq(bookings.companyId, companyId),
          // Status not cancelled or no_show
          or(
            eq(bookings.status, 'pending'),
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'completed'),
          ),
          // Time range overlap check
          // Booking overlaps if: existing_start < new_buffered_end AND existing_end > new_buffered_start
          lt(bookings.startTime, bufferedEnd),
          gt(bookings.endTime, bufferedStart),
        ),
      )
      .limit(1);

    if (conflictingBookings.length > 0) {
      // Throw 409 Conflict with SLOT_TAKEN code
      throw new AppError('SLOT_TAKEN', 'Time slot is already booked', 409);
    }

    // 6. Insert booking with pricing snapshot
    const [insertedBooking] = await tx
      .insert(bookings)
      .values({
        companyId,
        customerId: input.customer_id,
        serviceId: service.id,
        employeeId,
        startTime: startTime,
        endTime: endTime,
        status: 'pending',
        source: input.source || 'online',
        notes: input.notes,
        price: service.price,
        currency: service.currency,
        discountAmount: '0', // TODO: Apply coupon/gift card discount in future
        couponId: null, // TODO: Implement coupon logic
        giftCardId: null, // TODO: Implement gift card logic
      })
      .returning();

    // 7. Insert resource associations if provided
    if (input.resource_ids && input.resource_ids.length > 0) {
      await tx.insert(bookingResources).values(
        input.resource_ids.map((resourceId: number) => ({
          bookingId: insertedBooking.id,
          resourceId,
          quantity: 1,
        })),
      );
    }

    return {
      ...insertedBooking,
      employeeUuid,
      employeeName,
      serviceUuid: service.uuid,
      serviceName: service.name,
      serviceDuration: service.durationMinutes,
    };
  });

  // Transaction committed successfully

  // 8. Publish booking.created domain event
  try {
    await publishEvent(
      createBookingCreatedEvent({
        bookingUuid: booking.uuid,
        companyId: booking.companyId,
        customerUuid: '', // TODO: fetch customer UUID
        serviceUuid: booking.serviceUuid,
        employeeUuid: booking.employeeUuid ?? null,
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        status: 'pending',
        source: booking.source ?? 'online',
        price: booking.price,
        currency: booking.currency ?? 'CZK',
      }),
    );
  } catch (error) {
    // Event publishing is fire-and-forget in MVP
    // Log error but don't fail the request
    console.error('[Booking Service] Failed to publish booking.created event:', error);
  }

  // 9. Return booking with joined data
  const createdBooking = await getBooking(booking.id, companyId);
  if (!createdBooking) {
    throw new NotFoundError('Failed to retrieve created booking');
  }

  // 10. Fire confirmation email + create SMS reminder row (fire-and-forget, non-blocking)
  void fireBookingCreatedNotifications(booking.id, companyId, booking.startTime);

  return createdBooking;
}

// ============================================================================
// LIST BOOKINGS
// ============================================================================

/**
 * List bookings with pagination and filtering
 *
 * Supports filters:
 * - status: Filter by booking status
 * - customer_id: Filter by customer
 * - employee_id: Filter by employee
 * - service_id: Filter by service
 * - date_from/date_to: Filter by date range
 * - source: Filter by booking source
 *
 * @returns Paginated list of bookings with customer, service, and employee data
 */
export async function listBookings(
  query: BookingListQuery,
  companyId: number,
): Promise<{ data: BookingWithRelations[]; meta: PaginationMeta }> {
  const {
    page = 1,
    limit = 20,
    status,
    customer_id,
    employee_id,
    service_id,
    date_from,
    date_to,
    source,
  } = query;

  // Calculate pagination offset
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [eq(bookings.companyId, companyId), isNull(bookings.deletedAt)];

  if (status) {
    conditions.push(eq(bookings.status, status));
  }

  if (customer_id) {
    conditions.push(eq(bookings.customerId, customer_id));
  }

  if (employee_id) {
    conditions.push(eq(bookings.employeeId, employee_id));
  }

  if (service_id) {
    conditions.push(eq(bookings.serviceId, service_id));
  }

  if (date_from) {
    conditions.push(gte(bookings.startTime, new Date(date_from)));
  }

  if (date_to) {
    conditions.push(lt(bookings.startTime, new Date(date_to)));
  }

  if (source) {
    conditions.push(eq(bookings.source, source));
  }

  // Query bookings with JOINs for enriched response
  const data = await db
    .select({
      // Booking fields
      id: bookings.uuid,
      companyId: bookings.companyId,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      source: bookings.source,
      notes: bookings.notes,
      internalNotes: bookings.internalNotes,
      price: bookings.price,
      currency: bookings.currency,
      discountAmount: bookings.discountAmount,
      noShowProbability: bookings.noShowProbability,
      cancelledAt: bookings.cancelledAt,
      cancellationReason: bookings.cancellationReason,
      cancelledBy: bookings.cancelledBy,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      bookingMetadata: bookings.bookingMetadata,
      // Customer fields
      customerUuid: customers.uuid,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      // Service fields
      serviceUuid: services.uuid,
      serviceName: services.name,
      serviceDurationMinutes: services.durationMinutes,
      servicePrice: services.price,
      // Employee fields (nullable)
      employeeUuid: employees.uuid,
      employeeName: employees.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(employees, eq(bookings.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(bookings.startTime)
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(...conditions));

  const totalCount = countResult.count;
  const totalPages = Math.ceil(totalCount / limit);

  // Map to response format
  const responseData: BookingWithRelations[] = data.map((row) => ({
    id: row.id,
    companyId: row.companyId.toString(), // TODO: Map to company UUID
    customer: {
      id: row.customerUuid,
      name: row.customerName,
      email: row.customerEmail,
      phone: row.customerPhone,
    },
    service: {
      id: row.serviceUuid,
      name: row.serviceName,
      durationMinutes: row.serviceDurationMinutes,
      price: row.servicePrice,
    },
    employee:
      row.employeeUuid && row.employeeName
        ? {
            id: row.employeeUuid,
            name: row.employeeName,
          }
        : null,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    status: row.status ?? 'pending',
    source: row.source ?? 'online',
    notes: row.notes,
    internalNotes: row.internalNotes,
    price: row.price,
    currency: row.currency ?? 'CZK',
    discountAmount: row.discountAmount ?? '0',
    noShowProbability: row.noShowProbability,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancellationReason: row.cancellationReason,
    cancelledBy: row.cancelledBy,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    bookingMetadata: (row.bookingMetadata as Record<string, unknown> | null) ?? null,
  }));

  return {
    data: responseData,
    meta: {
      total: totalCount,
      page,
      limit,
      total_pages: totalPages,
    },
  };
}

// ============================================================================
// GET BOOKING
// ============================================================================

/**
 * Get booking detail by internal ID
 *
 * @param bookingId - Internal SERIAL ID
 * @param companyId - Company ID for tenant isolation
 * @returns Booking with joined customer, service, and employee data, or null if not found
 */
export async function getBooking(
  bookingId: number,
  companyId: number,
): Promise<BookingWithRelations | null> {
  const [booking] = await db
    .select({
      // Booking fields
      id: bookings.uuid,
      companyId: bookings.companyId,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      source: bookings.source,
      notes: bookings.notes,
      internalNotes: bookings.internalNotes,
      price: bookings.price,
      currency: bookings.currency,
      discountAmount: bookings.discountAmount,
      noShowProbability: bookings.noShowProbability,
      cancelledAt: bookings.cancelledAt,
      cancellationReason: bookings.cancellationReason,
      cancelledBy: bookings.cancelledBy,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      bookingMetadata: bookings.bookingMetadata,
      // Customer fields
      customerUuid: customers.uuid,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      // Service fields
      serviceUuid: services.uuid,
      serviceName: services.name,
      serviceDurationMinutes: services.durationMinutes,
      servicePrice: services.price,
      // Employee fields (nullable)
      employeeUuid: employees.uuid,
      employeeName: employees.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(employees, eq(bookings.employeeId, employees.id))
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.companyId, companyId),
        isNull(bookings.deletedAt),
      ),
    )
    .limit(1);

  if (!booking) {
    return null;
  }

  return {
    id: booking.id,
    companyId: booking.companyId.toString(), // TODO: Map to company UUID
    customer: {
      id: booking.customerUuid,
      name: booking.customerName,
      email: booking.customerEmail,
      phone: booking.customerPhone,
    },
    service: {
      id: booking.serviceUuid,
      name: booking.serviceName,
      durationMinutes: booking.serviceDurationMinutes,
      price: booking.servicePrice,
    },
    employee:
      booking.employeeUuid && booking.employeeName
        ? {
            id: booking.employeeUuid,
            name: booking.employeeName,
          }
        : null,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status ?? 'pending',
    source: booking.source ?? 'online',
    notes: booking.notes,
    internalNotes: booking.internalNotes,
    price: booking.price,
    currency: booking.currency ?? 'CZK',
    discountAmount: booking.discountAmount ?? '0',
    noShowProbability: booking.noShowProbability,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    cancellationReason: booking.cancellationReason,
    cancelledBy: booking.cancelledBy,
    createdAt: booking.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: booking.updatedAt?.toISOString() ?? new Date().toISOString(),
    bookingMetadata: (booking.bookingMetadata as Record<string, unknown> | null) ?? null,
  };
}

// ============================================================================
// UPDATE BOOKING
// ============================================================================

/**
 * Update booking fields
 *
 * If start_time is changed, re-validates availability using same SELECT FOR UPDATE pattern
 *
 * @throws NotFoundError if booking not found
 * @throws ConflictError (409) if new time slot is already taken
 */
export async function updateBooking(
  bookingId: number,
  input: BookingUpdate,
  companyId: number,
): Promise<BookingWithRelations> {
  // Get existing booking
  const existingBooking = await getBooking(bookingId, companyId);
  if (!existingBooking) {
    throw new NotFoundError('Booking not found');
  }

  // If start_time changed, re-validate availability
  if (input.start_time) {
    const newStartTime = new Date(input.start_time);

    await dbTx.transaction(async (tx) => {
      // Get booking internal ID and related data
      const [bookingData] = await tx
        .select({
          id: bookings.id,
          employeeId: bookings.employeeId,
          serviceId: bookings.serviceId,
        })
        .from(bookings)
        .where(and(eq(bookings.uuid, existingBooking.id), eq(bookings.companyId, companyId)))
        .limit(1);

      if (!bookingData || !bookingData.employeeId) {
        throw new NotFoundError('Booking not found or has no assigned employee');
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

      // Lock employee row
      await tx
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.id, bookingData.employeeId))
        .for('update');

      // Check for conflicts (exclude current booking)
      const bufferBefore = (service.bufferBeforeMinutes ?? 0) * 60 * 1000;
      const bufferAfter = (service.bufferAfterMinutes ?? 0) * 60 * 1000;
      const bufferedStart = new Date(newStartTime.getTime() - bufferBefore);
      const bufferedEnd = new Date(newEndTime.getTime() + bufferAfter);

      const conflictingBookings = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.employeeId, bookingData.employeeId),
            eq(bookings.companyId, companyId),
            sql`${bookings.id} != ${bookingData.id}`, // Exclude current booking
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

      // Update booking
      await tx
        .update(bookings)
        .set({
          startTime: newStartTime,
          endTime: newEndTime,
          employeeId: input.employee_id ?? bookingData.employeeId,
          notes: input.notes,
          internalNotes: input.internal_notes,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingData.id));
    });
  } else {
    // No time change, just update fields
    await db
      .update(bookings)
      .set({
        employeeId: input.employee_id,
        notes: input.notes,
        internalNotes: input.internal_notes,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.uuid, existingBooking.id), eq(bookings.companyId, companyId)));
  }

  // Return updated booking
  const [updated] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.uuid, existingBooking.id), eq(bookings.companyId, companyId)))
    .limit(1);

  if (!updated) {
    throw new NotFoundError('Failed to retrieve updated booking');
  }

  const updatedBooking = await getBooking(updated.id, companyId);
  if (!updatedBooking) {
    throw new NotFoundError('Failed to retrieve updated booking');
  }

  return updatedBooking;
}

// ============================================================================
// DELETE BOOKING
// ============================================================================

/**
 * Soft delete booking by setting deletedAt timestamp
 *
 * @throws NotFoundError if booking not found
 */
export async function deleteBooking(bookingId: number, companyId: number): Promise<void> {
  // First check if booking exists
  const [existing] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.companyId, companyId),
        isNull(bookings.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Booking not found');
  }

  // Soft delete
  await db
    .update(bookings)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));
}
