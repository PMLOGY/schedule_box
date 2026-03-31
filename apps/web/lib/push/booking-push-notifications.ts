/**
 * Booking Event Push Notifications
 *
 * Sends push notifications to customers and employees when booking events occur:
 * - Created: both customer and employee
 * - Confirmed: customer only
 * - Cancelled: both customer and employee
 *
 * All functions are fire-and-forget (never throw). Each push also creates
 * a notification record with channel='push' for audit trail.
 */

import { eq, and } from 'drizzle-orm';
import {
  db,
  bookings,
  customers,
  services,
  employees,
  companies,
  notifications,
  users,
} from '@schedulebox/database';
import { sendPushToUser } from '@/lib/push/web-push-service';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format booking time as "DD.MM.YYYY HH:mm" using Czech locale
 */
function formatBookingTime(startTime: Date): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Prague',
  }).format(startTime);
}

/**
 * Fetch booking data with joined customer, service, employee, company info.
 */
async function fetchBookingData(bookingId: number, companyId: number) {
  const [row] = await db
    .select({
      startTime: bookings.startTime,
      customerId: bookings.customerId,
      customerName: customers.name,
      customerEmail: customers.email,
      serviceName: services.name,
      employeeId: bookings.employeeId,
      employeeName: employees.name,
      employeeUserId: employees.userId,
      companyName: companies.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(companies, eq(bookings.companyId, companies.id))
    .leftJoin(employees, eq(bookings.employeeId, employees.id))
    .where(and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId)))
    .limit(1);

  return row ?? null;
}

/**
 * Find user ID for a customer by matching email + companyId in users table.
 * Customers may or may not have a user account.
 */
async function findCustomerUserId(
  customerEmail: string | null,
  companyId: number,
): Promise<number | null> {
  if (!customerEmail) return null;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, customerEmail), eq(users.companyId, companyId)))
    .limit(1);

  return user?.id ?? null;
}

/**
 * Send push and insert notification record. Returns silently on failure.
 */
async function sendAndLog(params: {
  userId: number;
  companyId: number;
  bookingId: number;
  customerId: number | null;
  recipient: string;
  title: string;
  body: string;
  url: string;
}): Promise<void> {
  const { userId, companyId, bookingId, customerId, recipient, title, body, url } = params;

  const result = await sendPushToUser(userId, { title, body, url });

  await db.insert(notifications).values({
    companyId,
    bookingId,
    customerId,
    channel: 'push',
    recipient,
    subject: title,
    body,
    status: result.sent > 0 ? 'sent' : 'failed',
    sentAt: result.sent > 0 ? new Date() : undefined,
    errorMessage:
      result.sent === 0 && result.failed > 0
        ? `Push delivery failed for ${result.failed} subscription(s)`
        : undefined,
  });
}

// ============================================================================
// BOOKING CREATED PUSH
// ============================================================================

/**
 * Send push notifications when a booking is created.
 * Notifies both the customer (if they have a user account) and the assigned employee.
 * Fire-and-forget: never throws.
 */
export async function sendBookingCreatedPush(
  bookingId: number,
  companyId: number,
): Promise<void> {
  try {
    const row = await fetchBookingData(bookingId, companyId);
    if (!row) return;

    const formattedTime = formatBookingTime(row.startTime);

    // Push to customer (if they have a user account)
    const customerUserId = await findCustomerUserId(row.customerEmail, companyId);
    if (customerUserId) {
      await sendAndLog({
        userId: customerUserId,
        companyId,
        bookingId,
        customerId: row.customerId,
        recipient: row.customerEmail ?? 'unknown',
        title: 'Nova rezervace',
        body: `${row.serviceName} - ${formattedTime}`,
        url: '/portal/bookings',
      });
    }

    // Push to employee (if assigned and has a user account)
    if (row.employeeUserId) {
      await sendAndLog({
        userId: row.employeeUserId,
        companyId,
        bookingId,
        customerId: null,
        recipient: row.employeeName ?? 'employee',
        title: 'Nova rezervace',
        body: `${row.customerName} - ${row.serviceName} - ${formattedTime}`,
        url: '/dashboard/bookings',
      });
    }
  } catch (err) {
    console.error('[Push] sendBookingCreatedPush error:', err);
  }
}

// ============================================================================
// BOOKING CONFIRMED PUSH
// ============================================================================

/**
 * Send push notification when a booking is confirmed.
 * Notifies the customer only.
 * Fire-and-forget: never throws.
 */
export async function sendBookingConfirmedPush(
  bookingId: number,
  companyId: number,
): Promise<void> {
  try {
    const row = await fetchBookingData(bookingId, companyId);
    if (!row) return;

    const formattedTime = formatBookingTime(row.startTime);

    // Push to customer only
    const customerUserId = await findCustomerUserId(row.customerEmail, companyId);
    if (customerUserId) {
      await sendAndLog({
        userId: customerUserId,
        companyId,
        bookingId,
        customerId: row.customerId,
        recipient: row.customerEmail ?? 'unknown',
        title: 'Rezervace potvrzena',
        body: `${row.serviceName} - ${formattedTime}`,
        url: '/portal/bookings',
      });
    }
  } catch (err) {
    console.error('[Push] sendBookingConfirmedPush error:', err);
  }
}

// ============================================================================
// BOOKING CANCELLED PUSH
// ============================================================================

/**
 * Send push notifications when a booking is cancelled.
 * Notifies both the customer and the assigned employee.
 * Fire-and-forget: never throws.
 */
export async function sendBookingCancelledPush(
  bookingId: number,
  companyId: number,
): Promise<void> {
  try {
    const row = await fetchBookingData(bookingId, companyId);
    if (!row) return;

    const formattedTime = formatBookingTime(row.startTime);

    // Push to customer
    const customerUserId = await findCustomerUserId(row.customerEmail, companyId);
    if (customerUserId) {
      await sendAndLog({
        userId: customerUserId,
        companyId,
        bookingId,
        customerId: row.customerId,
        recipient: row.customerEmail ?? 'unknown',
        title: 'Rezervace zrusena',
        body: `${row.serviceName} - ${formattedTime}`,
        url: '/portal/bookings',
      });
    }

    // Push to employee
    if (row.employeeUserId) {
      await sendAndLog({
        userId: row.employeeUserId,
        companyId,
        bookingId,
        customerId: null,
        recipient: row.employeeName ?? 'employee',
        title: 'Rezervace zrusena',
        body: `${row.customerName} - ${row.serviceName} - ${formattedTime}`,
        url: '/dashboard/bookings',
      });
    }
  } catch (err) {
    console.error('[Push] sendBookingCancelledPush error:', err);
  }
}
