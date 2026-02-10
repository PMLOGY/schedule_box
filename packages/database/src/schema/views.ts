/**
 * Database Views
 *
 * Drizzle pgView definitions for reporting and analytics:
 * - v_daily_booking_summary: Daily booking statistics per company
 * - v_customer_metrics: Customer health and value metrics
 */

import { pgView } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { bookings } from './bookings';
import { customers } from './customers';

// ============================================================================
// DAILY BOOKING SUMMARY VIEW
// ============================================================================

/**
 * v_daily_booking_summary
 *
 * Aggregates booking data by company and date for reporting and analytics.
 * Provides daily counts, status breakdown, and revenue totals.
 */
export const dailyBookingSummary = pgView('v_daily_booking_summary').as((qb) => {
  return qb
    .select({
      companyId: bookings.companyId,
      bookingDate: sql<string>`DATE(${bookings.startTime})`.as('booking_date'),
      totalBookings: sql<number>`COUNT(*)`.as('total_bookings'),
      completed: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'completed')`.as(
        'completed',
      ),
      cancelled: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'cancelled')`.as(
        'cancelled',
      ),
      noShows: sql<number>`COUNT(*) FILTER (WHERE ${bookings.status} = 'no_show')`.as('no_shows'),
      totalRevenue:
        sql<number>`SUM(${bookings.price} - ${bookings.discountAmount}) FILTER (WHERE ${bookings.status} = 'completed')`.as(
          'total_revenue',
        ),
    })
    .from(bookings)
    .groupBy(bookings.companyId, sql`DATE(${bookings.startTime})`);
});

// ============================================================================
// CUSTOMER METRICS VIEW
// ============================================================================

/**
 * v_customer_metrics
 *
 * Aggregates customer data for health scoring, CLV prediction, and segmentation.
 * Provides booking counts, revenue totals, and engagement metrics per customer.
 */
export const customerMetrics = pgView('v_customer_metrics').as((qb) => {
  return qb
    .select({
      customerId: customers.id,
      companyId: customers.companyId,
      totalBookings: sql<number>`COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = ${customers.id}
          AND b.deleted_at IS NULL
      ), 0)`.as('total_bookings'),
      completedBookings: sql<number>`COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = ${customers.id}
          AND b.status = 'completed'
          AND b.deleted_at IS NULL
      ), 0)`.as('completed_bookings'),
      cancelledBookings: sql<number>`COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = ${customers.id}
          AND b.status = 'cancelled'
          AND b.deleted_at IS NULL
      ), 0)`.as('cancelled_bookings'),
      noShowCount: sql<number>`COALESCE((
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.customer_id = ${customers.id}
          AND b.status = 'no_show'
          AND b.deleted_at IS NULL
      ), 0)`.as('no_show_count'),
      totalRevenue: sql<number>`COALESCE((
        SELECT SUM(b.price - b.discount_amount)
        FROM bookings b
        WHERE b.customer_id = ${customers.id}
          AND b.status = 'completed'
          AND b.deleted_at IS NULL
      ), 0)`.as('total_revenue'),
      lastBookingDate: sql<string>`(
        SELECT MAX(b.start_time)
        FROM bookings b
        WHERE b.customer_id = ${customers.id}
          AND b.deleted_at IS NULL
      )`.as('last_booking_date'),
      daysSinceLastBooking: sql<number>`CASE
        WHEN (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = ${customers.id}
            AND b.deleted_at IS NULL
        ) IS NOT NULL
        THEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = ${customers.id}
            AND b.deleted_at IS NULL
        ))::INTEGER
        ELSE NULL
      END`.as('days_since_last_booking'),
      healthScore: customers.healthScore,
      clvPredicted: customers.clvPredicted,
      status: sql<string>`CASE
        WHEN ${customers.deletedAt} IS NOT NULL THEN 'deleted'
        WHEN (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = ${customers.id}
            AND b.deleted_at IS NULL
        ) IS NULL THEN 'new'
        WHEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = ${customers.id}
            AND b.deleted_at IS NULL
        )) > 90 THEN 'at_risk'
        WHEN EXTRACT(DAY FROM NOW() - (
          SELECT MAX(b.start_time)
          FROM bookings b
          WHERE b.customer_id = ${customers.id}
            AND b.deleted_at IS NULL
        )) > 180 THEN 'dormant'
        ELSE 'active'
      END`.as('status'),
    })
    .from(customers);
});
