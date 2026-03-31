/**
 * Waitlist Service Layer
 *
 * Business logic for booking waitlist operations:
 * - Join waitlist when group class is full
 * - Auto-promote first waitlisted customer when spot opens (cancellation)
 * - Notification via push + email on promotion
 * - Cancel and reposition waitlist entries
 */

import { eq, and, sql, asc, gt } from 'drizzle-orm';
import {
  db,
  bookingWaitlist,
  bookings,
  services,
  customers,
  employees,
  companies,
  notifications,
  users,
  roles,
} from '@schedulebox/database';
import { NotFoundError, ValidationError } from '@schedulebox/shared';
import { createBooking } from '@/lib/booking/booking-service';
import { sendPushToUser } from '@/lib/push/web-push-service';
import { sendBookingConfirmationEmail } from '@/lib/email/booking-emails';

// ============================================================================
// TYPES
// ============================================================================

export interface WaitlistEntry {
  id: string; // UUID
  customerId: string; // UUID
  customerName: string;
  serviceId: string; // UUID
  serviceName: string;
  employeeId: string | null; // UUID
  employeeName: string | null;
  preferredTime: string; // ISO datetime
  position: number;
  status: 'waiting' | 'promoted' | 'expired' | 'cancelled';
  promotedAt: string | null;
  promotedBookingId: string | null;
  notifiedAt: string | null;
  createdAt: string;
}

export interface PromotionResult {
  entry: WaitlistEntry;
  bookingId: string;
  customerName: string;
}

// ============================================================================
// UUID RESOLUTION HELPERS
// ============================================================================

async function resolveServiceUuid(
  serviceUuid: string,
  companyId: number,
): Promise<{
  id: number;
  name: string;
  maxCapacity: number;
  durationMinutes: number;
  price: string;
  currency: string | null;
}> {
  const [service] = await db
    .select({
      id: services.id,
      name: services.name,
      maxCapacity: services.maxCapacity,
      durationMinutes: services.durationMinutes,
      price: services.price,
      currency: services.currency,
    })
    .from(services)
    .where(and(eq(services.uuid, serviceUuid), eq(services.companyId, companyId)))
    .limit(1);

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  return {
    id: service.id,
    name: service.name,
    maxCapacity: service.maxCapacity ?? 1,
    durationMinutes: service.durationMinutes,
    price: service.price,
    currency: service.currency,
  };
}

async function resolveCustomerUuid(
  customerUuid: string,
  companyId: number,
): Promise<{ id: number; name: string; email: string | null }> {
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
    })
    .from(customers)
    .where(and(eq(customers.uuid, customerUuid), eq(customers.companyId, companyId)))
    .limit(1);

  if (!customer) {
    throw new NotFoundError('Customer not found');
  }

  return customer;
}

async function resolveEmployeeUuid(
  employeeUuid: string,
  companyId: number,
): Promise<{ id: number; name: string }> {
  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
    })
    .from(employees)
    .where(and(eq(employees.uuid, employeeUuid), eq(employees.companyId, companyId)))
    .limit(1);

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  return employee;
}

// ============================================================================
// MAP WAITLIST ROW TO RESPONSE
// ============================================================================

function mapWaitlistRow(row: {
  uuid: string;
  customerUuid: string;
  customerName: string;
  serviceUuid: string;
  serviceName: string;
  employeeUuid: string | null;
  employeeName: string | null;
  preferredTime: Date;
  position: number;
  status: string | null;
  promotedAt: Date | null;
  promotedBookingUuid: string | null;
  notifiedAt: Date | null;
  createdAt: Date;
}): WaitlistEntry {
  return {
    id: row.uuid,
    customerId: row.customerUuid,
    customerName: row.customerName,
    serviceId: row.serviceUuid,
    serviceName: row.serviceName,
    employeeId: row.employeeUuid,
    employeeName: row.employeeName,
    preferredTime: row.preferredTime.toISOString(),
    position: row.position,
    status: (row.status as WaitlistEntry['status']) ?? 'waiting',
    promotedAt: row.promotedAt?.toISOString() ?? null,
    promotedBookingId: row.promotedBookingUuid ?? null,
    notifiedAt: row.notifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Shared select fields for waitlist queries */
const waitlistSelectFields = {
  uuid: bookingWaitlist.uuid,
  customerUuid: customers.uuid,
  customerName: customers.name,
  serviceUuid: services.uuid,
  serviceName: services.name,
  employeeUuid: employees.uuid,
  employeeName: employees.name,
  preferredTime: bookingWaitlist.preferredTime,
  position: bookingWaitlist.position,
  status: bookingWaitlist.status,
  promotedAt: bookingWaitlist.promotedAt,
  promotedBookingUuid: bookings.uuid,
  notifiedAt: bookingWaitlist.notifiedAt,
  createdAt: bookingWaitlist.createdAt,
};

// ============================================================================
// JOIN WAITLIST
// ============================================================================

/**
 * Join the waitlist for a group class that is full.
 *
 * 1. Resolves UUIDs to internal IDs
 * 2. Verifies service is a group class (maxCapacity > 1)
 * 3. Verifies the slot is actually full
 * 4. Checks for duplicate entries
 * 5. Calculates position and inserts
 */
export async function joinWaitlist(
  data: {
    serviceId: string;
    employeeId?: string;
    customerId: string;
    preferredTime: string;
  },
  companyId: number,
): Promise<WaitlistEntry> {
  // 1. Resolve UUIDs
  const service = await resolveServiceUuid(data.serviceId, companyId);
  const customer = await resolveCustomerUuid(data.customerId, companyId);

  let employeeInternal: { id: number; name: string } | null = null;
  if (data.employeeId) {
    employeeInternal = await resolveEmployeeUuid(data.employeeId, companyId);
  }

  // 2. Verify service is a group class
  if (service.maxCapacity <= 1) {
    throw new ValidationError(
      'Waitlist is only available for group classes (maxCapacity > 1). This service is 1:1.',
    );
  }

  const preferredTime = new Date(data.preferredTime);

  // 3. Count existing confirmed/pending bookings for this service + time
  const [bookingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.serviceId, service.id),
        eq(bookings.companyId, companyId),
        eq(bookings.startTime, preferredTime),
        sql`${bookings.status} IN ('pending', 'confirmed')`,
      ),
    );

  if (bookingCount.count < service.maxCapacity) {
    throw new ValidationError(
      `This slot is not full yet (${bookingCount.count}/${service.maxCapacity} booked). Please book normally instead of joining the waitlist.`,
    );
  }

  // 4. Check for duplicate waitlist entry (same customer, service, time, status=waiting)
  const [existingEntry] = await db
    .select({ id: bookingWaitlist.id })
    .from(bookingWaitlist)
    .where(
      and(
        eq(bookingWaitlist.companyId, companyId),
        eq(bookingWaitlist.customerId, customer.id),
        eq(bookingWaitlist.serviceId, service.id),
        eq(bookingWaitlist.preferredTime, preferredTime),
        eq(bookingWaitlist.status, 'waiting'),
      ),
    )
    .limit(1);

  if (existingEntry) {
    throw new ValidationError('Customer is already on the waitlist for this slot.');
  }

  // 5. Calculate position: count existing 'waiting' entries + 1
  const [positionResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookingWaitlist)
    .where(
      and(
        eq(bookingWaitlist.companyId, companyId),
        eq(bookingWaitlist.serviceId, service.id),
        eq(bookingWaitlist.preferredTime, preferredTime),
        eq(bookingWaitlist.status, 'waiting'),
      ),
    );

  const position = positionResult.count + 1;

  // 6. Insert waitlist entry
  const [inserted] = await db
    .insert(bookingWaitlist)
    .values({
      companyId,
      customerId: customer.id,
      serviceId: service.id,
      employeeId: employeeInternal?.id ?? null,
      preferredTime,
      position,
      status: 'waiting',
    })
    .returning();

  // 7. Return the entry with joined data
  return {
    id: inserted.uuid,
    customerId: data.customerId,
    customerName: customer.name,
    serviceId: data.serviceId,
    serviceName: service.name,
    employeeId: data.employeeId ?? null,
    employeeName: employeeInternal?.name ?? null,
    preferredTime: preferredTime.toISOString(),
    position,
    status: 'waiting',
    promotedAt: null,
    promotedBookingId: null,
    notifiedAt: null,
    createdAt: inserted.createdAt.toISOString(),
  };
}

// ============================================================================
// PROMOTE FROM WAITLIST
// ============================================================================

/**
 * Auto-promote the first waiting customer from the waitlist.
 * Called when a group class booking is cancelled.
 *
 * 1. Find first 'waiting' entry ordered by position ASC
 * 2. Create a booking for the promoted customer
 * 3. Update waitlist entry status
 * 4. Send push + email notifications (fire-and-forget)
 * 5. Create notification audit records
 *
 * @returns PromotionResult if someone was promoted, null if no one waiting
 */
export async function promoteFromWaitlist(
  serviceId: number,
  employeeId: number | null,
  preferredTime: Date,
  companyId: number,
): Promise<PromotionResult | null> {
  // 1. Find first waiting entry
  const [firstWaiting] = await db
    .select({
      id: bookingWaitlist.id,
      uuid: bookingWaitlist.uuid,
      customerId: bookingWaitlist.customerId,
      serviceId: bookingWaitlist.serviceId,
      employeeId: bookingWaitlist.employeeId,
    })
    .from(bookingWaitlist)
    .where(
      and(
        eq(bookingWaitlist.companyId, companyId),
        eq(bookingWaitlist.serviceId, serviceId),
        eq(bookingWaitlist.preferredTime, preferredTime),
        eq(bookingWaitlist.status, 'waiting'),
      ),
    )
    .orderBy(asc(bookingWaitlist.position))
    .limit(1);

  if (!firstWaiting) {
    return null; // No one waiting
  }

  // 2. Get customer details for booking creation
  const [customer] = await db
    .select({
      id: customers.id,
      uuid: customers.uuid,
      name: customers.name,
      email: customers.email,
    })
    .from(customers)
    .where(eq(customers.id, firstWaiting.customerId))
    .limit(1);

  if (!customer) {
    console.error('[Waitlist] Customer not found for promotion:', firstWaiting.customerId);
    return null;
  }

  // Get service details
  const [service] = await db
    .select({
      id: services.id,
      uuid: services.uuid,
      name: services.name,
      durationMinutes: services.durationMinutes,
    })
    .from(services)
    .where(eq(services.id, firstWaiting.serviceId))
    .limit(1);

  if (!service) {
    console.error('[Waitlist] Service not found for promotion:', firstWaiting.serviceId);
    return null;
  }

  // Determine employee for booking
  const bookingEmployeeId = firstWaiting.employeeId ?? employeeId;

  // 3. Create booking for the promoted customer
  // We need a userId for createBooking context — use a system user approach
  // Find any admin/owner user for this company to use as context
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.companyId, companyId), sql`${roles.name} IN ('admin', 'owner')`))
    .limit(1);

  const contextUserId = adminUser?.id ?? 0;

  let newBooking;
  try {
    newBooking = await createBooking(
      {
        customer_id: customer.id,
        service_id: service.id,
        employee_id: bookingEmployeeId ?? undefined,
        start_time: preferredTime.toISOString(),
        source: 'online',
        notes: 'Automaticky presunuto z cekaci listiny / Auto-promoted from waitlist',
      },
      { companyId, userId: contextUserId },
    );
  } catch (err) {
    console.error('[Waitlist] Failed to create booking for promoted customer:', err);
    return null;
  }

  // Get the new booking's internal ID
  const [newBookingRecord] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.uuid, newBooking.id))
    .limit(1);

  // 4. Update waitlist entry: promoted
  const now = new Date();
  await db
    .update(bookingWaitlist)
    .set({
      status: 'promoted',
      promotedAt: now,
      promotedBookingId: newBookingRecord?.id ?? null,
      updatedAt: now,
    })
    .where(eq(bookingWaitlist.id, firstWaiting.id));

  // 5. Send notifications (fire-and-forget, never throw)
  void sendPromotionNotifications(
    customer.id,
    customer.name,
    customer.email,
    service.name,
    preferredTime,
    companyId,
    newBooking.id,
  );

  // 6. Update notifiedAt
  await db
    .update(bookingWaitlist)
    .set({ notifiedAt: now, updatedAt: now })
    .where(eq(bookingWaitlist.id, firstWaiting.id));

  return {
    entry: {
      id: firstWaiting.uuid,
      customerId: customer.uuid,
      customerName: customer.name,
      serviceId: service.uuid,
      serviceName: service.name,
      employeeId: null,
      employeeName: null,
      preferredTime: preferredTime.toISOString(),
      position: 1,
      status: 'promoted',
      promotedAt: now.toISOString(),
      promotedBookingId: newBooking.id,
      notifiedAt: now.toISOString(),
      createdAt: now.toISOString(),
    },
    bookingId: newBooking.id,
    customerName: customer.name,
  };
}

// ============================================================================
// NOTIFICATION HELPER
// ============================================================================

/**
 * Send push and email notifications for waitlist promotion.
 * Fire-and-forget — never throws.
 */
async function sendPromotionNotifications(
  customerId: number,
  customerName: string,
  customerEmail: string | null,
  serviceName: string,
  startTime: Date,
  companyId: number,
  bookingUuid: string,
): Promise<void> {
  try {
    // Find userId for push notifications (customer may have a linked user account via email)
    const [customerRecord] = await db
      .select({ email: customers.email })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    let userRecord: { id: number } | undefined;
    if (customerRecord?.email) {
      const [foundUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, customerRecord.email), eq(users.companyId, companyId)))
        .limit(1);
      userRecord = foundUser;
    }

    // Get company details for email
    const [company] = await db
      .select({
        name: companies.name,
        phone: companies.phone,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    // Push notification
    if (userRecord) {
      try {
        await sendPushToUser(userRecord.id, {
          title: 'Misto se uvolnilo!',
          body: `Byli jste automaticky presunuti z cekaci listiny na ${serviceName}.`,
          url: `/bookings`,
        });

        // Audit trail for push
        await db.insert(notifications).values({
          companyId,
          customerId,
          channel: 'push',
          recipient: `user:${userRecord.id}`,
          subject: 'Misto se uvolnilo!',
          body: `Byli jste automaticky presunuti z cekaci listiny na ${serviceName}.`,
          status: 'sent',
          sentAt: new Date(),
        });
      } catch (pushErr) {
        console.error('[Waitlist] Push notification failed:', pushErr);
        await db.insert(notifications).values({
          companyId,
          customerId,
          channel: 'push',
          recipient: `user:${userRecord.id}`,
          subject: 'Misto se uvolnilo!',
          body: `Byli jste automaticky presunuti z cekaci listiny na ${serviceName}.`,
          status: 'failed',
          errorMessage: String(pushErr),
        });
      }
    }

    // Email notification — reuse booking confirmation template
    if (customerEmail && company) {
      try {
        await sendBookingConfirmationEmail({
          to: customerEmail,
          customerName,
          serviceName,
          employeeName: null,
          startTime,
          companyName: company.name,
          companyPhone: company.phone ?? null,
          bookingUuid,
        });

        // Audit trail for email
        await db.insert(notifications).values({
          companyId,
          customerId,
          channel: 'email',
          recipient: customerEmail,
          subject: 'Potvrzeni rezervace z cekaci listiny',
          body: `Automaticke potvrzeni rezervace (${bookingUuid}) pro ${serviceName}`,
          status: 'sent',
          sentAt: new Date(),
        });
      } catch (emailErr) {
        console.error('[Waitlist] Email notification failed:', emailErr);
        await db.insert(notifications).values({
          companyId,
          customerId,
          channel: 'email',
          recipient: customerEmail,
          subject: 'Potvrzeni rezervace z cekaci listiny',
          body: `Automaticke potvrzeni rezervace (${bookingUuid}) pro ${serviceName}`,
          status: 'failed',
          errorMessage: String(emailErr),
        });
      }
    }
  } catch (err) {
    // Non-critical — log and continue
    console.error('[Waitlist] sendPromotionNotifications error:', err);
  }
}

// ============================================================================
// GET WAITLIST FOR SLOT
// ============================================================================

/**
 * List all waiting entries for a specific service + time slot, ordered by position.
 */
export async function getWaitlistForSlot(
  serviceUuid: string,
  preferredTime: string,
  companyId: number,
): Promise<WaitlistEntry[]> {
  const service = await resolveServiceUuid(serviceUuid, companyId);
  const time = new Date(preferredTime);

  const rows = await db
    .select(waitlistSelectFields)
    .from(bookingWaitlist)
    .innerJoin(customers, eq(bookingWaitlist.customerId, customers.id))
    .innerJoin(services, eq(bookingWaitlist.serviceId, services.id))
    .leftJoin(employees, eq(bookingWaitlist.employeeId, employees.id))
    .leftJoin(bookings, eq(bookingWaitlist.promotedBookingId, bookings.id))
    .where(
      and(
        eq(bookingWaitlist.companyId, companyId),
        eq(bookingWaitlist.serviceId, service.id),
        eq(bookingWaitlist.preferredTime, time),
        eq(bookingWaitlist.status, 'waiting'),
      ),
    )
    .orderBy(asc(bookingWaitlist.position));

  return rows.map(mapWaitlistRow);
}

// ============================================================================
// GET SINGLE WAITLIST ENTRY
// ============================================================================

/**
 * Get a single waitlist entry by UUID.
 */
export async function getWaitlistEntry(
  entryUuid: string,
  companyId: number,
): Promise<WaitlistEntry> {
  const [row] = await db
    .select(waitlistSelectFields)
    .from(bookingWaitlist)
    .innerJoin(customers, eq(bookingWaitlist.customerId, customers.id))
    .innerJoin(services, eq(bookingWaitlist.serviceId, services.id))
    .leftJoin(employees, eq(bookingWaitlist.employeeId, employees.id))
    .leftJoin(bookings, eq(bookingWaitlist.promotedBookingId, bookings.id))
    .where(and(eq(bookingWaitlist.uuid, entryUuid), eq(bookingWaitlist.companyId, companyId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Waitlist entry not found');
  }

  return mapWaitlistRow(row);
}

// ============================================================================
// CANCEL WAITLIST ENTRY
// ============================================================================

/**
 * Cancel a waitlist entry and reposition remaining entries.
 */
export async function cancelWaitlistEntry(
  entryUuid: string,
  companyId: number,
): Promise<WaitlistEntry> {
  // Get the entry first
  const [entry] = await db
    .select({
      id: bookingWaitlist.id,
      serviceId: bookingWaitlist.serviceId,
      preferredTime: bookingWaitlist.preferredTime,
      position: bookingWaitlist.position,
      status: bookingWaitlist.status,
    })
    .from(bookingWaitlist)
    .where(and(eq(bookingWaitlist.uuid, entryUuid), eq(bookingWaitlist.companyId, companyId)))
    .limit(1);

  if (!entry) {
    throw new NotFoundError('Waitlist entry not found');
  }

  if (entry.status !== 'waiting') {
    throw new ValidationError(`Cannot cancel a waitlist entry with status '${entry.status}'.`);
  }

  const now = new Date();

  // Set status to cancelled
  await db
    .update(bookingWaitlist)
    .set({ status: 'cancelled', updatedAt: now })
    .where(eq(bookingWaitlist.id, entry.id));

  // Reposition remaining entries: decrement position for entries after this one
  await db
    .update(bookingWaitlist)
    .set({
      position: sql`${bookingWaitlist.position} - 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(bookingWaitlist.companyId, companyId),
        eq(bookingWaitlist.serviceId, entry.serviceId),
        eq(bookingWaitlist.preferredTime, entry.preferredTime),
        eq(bookingWaitlist.status, 'waiting'),
        gt(bookingWaitlist.position, entry.position),
      ),
    );

  // Return the updated entry
  return getWaitlistEntry(entryUuid, companyId);
}

// ============================================================================
// GET CUSTOMER WAITLIST ENTRIES
// ============================================================================

/**
 * List a customer's active (waiting) waitlist entries.
 */
export async function getCustomerWaitlistEntries(
  customerUuid: string,
  companyId: number,
): Promise<WaitlistEntry[]> {
  const customer = await resolveCustomerUuid(customerUuid, companyId);

  const rows = await db
    .select(waitlistSelectFields)
    .from(bookingWaitlist)
    .innerJoin(customers, eq(bookingWaitlist.customerId, customers.id))
    .innerJoin(services, eq(bookingWaitlist.serviceId, services.id))
    .leftJoin(employees, eq(bookingWaitlist.employeeId, employees.id))
    .leftJoin(bookings, eq(bookingWaitlist.promotedBookingId, bookings.id))
    .where(
      and(
        eq(bookingWaitlist.companyId, companyId),
        eq(bookingWaitlist.customerId, customer.id),
        eq(bookingWaitlist.status, 'waiting'),
      ),
    )
    .orderBy(asc(bookingWaitlist.createdAt));

  return rows.map(mapWaitlistRow);
}

// ============================================================================
// LIST WAITLIST ENTRIES (for company)
// ============================================================================

/**
 * List waitlist entries for a company with optional filters.
 */
export async function listWaitlistEntries(
  companyId: number,
  filters: { serviceId?: number; status?: 'waiting' | 'promoted' | 'expired' | 'cancelled' },
): Promise<WaitlistEntry[]> {
  const conditions = [eq(bookingWaitlist.companyId, companyId)];

  if (filters.serviceId) {
    conditions.push(eq(bookingWaitlist.serviceId, filters.serviceId));
  }

  if (filters.status) {
    conditions.push(eq(bookingWaitlist.status, filters.status));
  } else {
    // Default to 'waiting'
    conditions.push(eq(bookingWaitlist.status, 'waiting'));
  }

  const rows = await db
    .select(waitlistSelectFields)
    .from(bookingWaitlist)
    .innerJoin(customers, eq(bookingWaitlist.customerId, customers.id))
    .innerJoin(services, eq(bookingWaitlist.serviceId, services.id))
    .leftJoin(employees, eq(bookingWaitlist.employeeId, employees.id))
    .leftJoin(bookings, eq(bookingWaitlist.promotedBookingId, bookings.id))
    .where(and(...conditions))
    .orderBy(asc(bookingWaitlist.position));

  return rows.map(mapWaitlistRow);
}
