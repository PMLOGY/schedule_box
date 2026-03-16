/**
 * Usage Service
 *
 * Provides all usage counting and limit checking functions for the
 * subscription tier enforcement system:
 *
 * - Redis-backed atomic booking counter (per company, per billing period)
 * - DB-based employee and service counts (total active, not period-based)
 * - Plan-aware limit check functions that throw AppError 402 when exceeded
 * - Usage summary aggregator for the dashboard widget
 *
 * Fail-open on Redis errors (same pattern as rate-limit.ts) — if Redis
 * is unavailable, booking counts fall back to DB queries.
 */

import { redis } from '@/lib/redis/client';
import { eq, and, isNull, sql, gte } from 'drizzle-orm';
import { db, employees, services, companies, bookings } from '@schedulebox/database';
import { AppError, type SubscriptionPlan } from '@schedulebox/shared';
import { getLimitsForPlan, isUnlimited } from './plan-limits';

// ============================================================================
// TYPES
// ============================================================================

export interface UsageItem {
  resource: string;
  current: number;
  limit: number;
  unlimited: boolean;
  percentUsed: number; // 0-100, capped at 100
  warning: boolean; // true when >= 80%
}

export interface UsageSummary {
  plan: SubscriptionPlan;
  period: string; // YYYY-MM
  items: UsageItem[];
}

// ============================================================================
// REDIS KEY HELPERS
// ============================================================================

/**
 * Redis key format: usage:bookings:{companyId}:{YYYY-MM}
 */
function bookingCounterKey(companyId: number, period: string): string {
  return `usage:bookings:${companyId}:${period}`;
}

/**
 * Get the current billing period as YYYY-MM string.
 */
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get seconds remaining until the end of the current month.
 * Used as TTL for Redis booking counter keys.
 */
function getSecondsUntilEndOfMonth(): number {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.ceil((endOfMonth.getTime() - now.getTime()) / 1000);
}

/**
 * Get the start of the current month as a Date (for DB fallback queries).
 */
function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ============================================================================
// BOOKING COUNTER (REDIS-BACKED)
// ============================================================================

/**
 * Atomically increment the booking counter for a company in the current period.
 *
 * On first increment (result === 1), sets a TTL so the key auto-expires
 * at the end of the billing month.
 *
 * Fail-open: returns 0 on Redis error (bookings are not blocked).
 *
 * @param companyId - Internal company ID
 * @returns New count after increment
 */
export async function incrementBookingCounter(companyId: number): Promise<number> {
  try {
    const key = bookingCounterKey(companyId, getCurrentPeriod());
    const newCount = await redis.incr(key);

    // Set TTL on first increment so the key auto-expires
    if (newCount === 1) {
      const ttl = getSecondsUntilEndOfMonth();
      await redis.expire(key, ttl);
    }

    return newCount;
  } catch (error) {
    console.error('[UsageService] Redis incrementBookingCounter error:', error);
    return 0; // Fail-open
  }
}

/**
 * Get the current booking count for a company in the current period.
 *
 * Reads from Redis first; falls back to a DB COUNT query if Redis is unavailable.
 *
 * @param companyId - Internal company ID
 * @returns Current booking count for the billing period
 */
export async function getBookingCount(companyId: number): Promise<number> {
  // Try Redis first for the fast-path counter
  try {
    const key = bookingCounterKey(companyId, getCurrentPeriod());
    const result = await redis.get<string>(key);
    if (result !== null) {
      return parseInt(String(result), 10) || 0;
    }
    // Key doesn't exist in Redis — fall through to DB count
  } catch (error) {
    console.error('[UsageService] Redis getBookingCount error, falling back to DB:', error);
  }

  // Fallback: count bookings created this month from DB
  try {
    const startOfMonth = getStartOfMonth();
    const [result] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(bookings)
      .where(
        and(
          eq(bookings.companyId, companyId),
          gte(bookings.createdAt, startOfMonth),
          isNull(bookings.deletedAt),
        ),
      );
    return result?.count ?? 0;
  } catch (dbError) {
    console.error('[UsageService] DB fallback for booking count also failed:', dbError);
    return 0; // Fail-open
  }
}

// ============================================================================
// EMPLOYEE & SERVICE COUNTS (DB-BACKED)
// ============================================================================

/**
 * Get the count of active (non-deleted) employees for a company.
 *
 * @param companyId - Internal company ID
 * @returns Active employee count
 */
export async function getEmployeeCount(companyId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(employees)
    .where(and(eq(employees.companyId, companyId), isNull(employees.deletedAt)));
  return result?.count ?? 0;
}

/**
 * Get the count of active (non-deleted) services for a company.
 *
 * @param companyId - Internal company ID
 * @returns Active service count
 */
export async function getServiceCount(companyId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(services)
    .where(and(eq(services.companyId, companyId), isNull(services.deletedAt)));
  return result?.count ?? 0;
}

// ============================================================================
// COMPANY PLAN LOOKUP
// ============================================================================

/**
 * Get the subscription plan for a company.
 *
 * @param companyId - Internal company ID
 * @returns Subscription plan tier (defaults to 'free' if not set)
 */
async function getCompanyPlan(companyId: number): Promise<SubscriptionPlan> {
  const [result] = await db
    .select({ plan: companies.subscriptionPlan })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return (result?.plan as SubscriptionPlan) ?? 'free';
}

// ============================================================================
// LIMIT CHECK FUNCTIONS (THROW 402 IF EXCEEDED)
// ============================================================================

/**
 * Check if a company has reached its monthly booking limit.
 * Throws AppError 402 if the limit is exceeded.
 *
 * @param companyId - Internal company ID
 * @throws AppError with code PLAN_LIMIT_EXCEEDED and status 402
 */
export async function checkBookingLimit(companyId: number): Promise<void> {
  const plan = await getCompanyPlan(companyId);
  const limits = getLimitsForPlan(plan);

  if (isUnlimited(limits.maxBookingsPerMonth)) {
    return;
  }

  const current = await getBookingCount(companyId);

  if (current >= limits.maxBookingsPerMonth) {
    throw new AppError(
      'PLAN_LIMIT_EXCEEDED',
      `Monthly booking limit reached (${current}/${limits.maxBookingsPerMonth})`,
      402,
      {
        resource: 'bookings',
        current,
        limit: limits.maxBookingsPerMonth,
        plan,
        upgradeUrl: '/settings/billing',
      },
    );
  }
}

/**
 * Check if a company has reached its employee limit.
 * Throws AppError 402 if the limit is exceeded.
 *
 * @param companyId - Internal company ID
 * @throws AppError with code PLAN_LIMIT_EXCEEDED and status 402
 */
export async function checkEmployeeLimit(companyId: number): Promise<void> {
  const plan = await getCompanyPlan(companyId);
  const limits = getLimitsForPlan(plan);

  if (isUnlimited(limits.maxEmployees)) {
    return;
  }

  const current = await getEmployeeCount(companyId);

  if (current >= limits.maxEmployees) {
    throw new AppError(
      'PLAN_LIMIT_EXCEEDED',
      `Employee limit reached (${current}/${limits.maxEmployees})`,
      402,
      {
        resource: 'employees',
        current,
        limit: limits.maxEmployees,
        plan,
        upgradeUrl: '/settings/billing',
      },
    );
  }
}

/**
 * Check if a company has reached its service limit.
 * Throws AppError 402 if the limit is exceeded.
 *
 * @param companyId - Internal company ID
 * @throws AppError with code PLAN_LIMIT_EXCEEDED and status 402
 */
export async function checkServiceLimit(companyId: number): Promise<void> {
  const plan = await getCompanyPlan(companyId);
  const limits = getLimitsForPlan(plan);

  if (isUnlimited(limits.maxServices)) {
    return;
  }

  const current = await getServiceCount(companyId);

  if (current >= limits.maxServices) {
    throw new AppError(
      'PLAN_LIMIT_EXCEEDED',
      `Service limit reached (${current}/${limits.maxServices})`,
      402,
      {
        resource: 'services',
        current,
        limit: limits.maxServices,
        plan,
        upgradeUrl: '/settings/billing',
      },
    );
  }
}

// ============================================================================
// USAGE SUMMARY
// ============================================================================

/**
 * Get the full usage summary for a company.
 *
 * Returns current consumption vs tier limits for bookings, employees,
 * and services — including percentage used and warning flags.
 *
 * Used by GET /api/v1/usage and the dashboard usage widget.
 *
 * @param companyId - Internal company ID
 * @returns Usage summary with plan, period, and resource items
 */
export async function getUsageSummary(companyId: number): Promise<UsageSummary> {
  const plan = await getCompanyPlan(companyId);
  const limits = getLimitsForPlan(plan);

  // Fetch all counts in parallel
  const [bookingCount, employeeCount, serviceCount] = await Promise.all([
    getBookingCount(companyId),
    getEmployeeCount(companyId),
    getServiceCount(companyId),
  ]);

  function buildItem(resource: string, current: number, limit: number): UsageItem {
    const unlimited = isUnlimited(limit);
    const percentUsed = unlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
    const warning = !unlimited && percentUsed >= 80;
    return { resource, current, limit, unlimited, percentUsed, warning };
  }

  return {
    plan,
    period: getCurrentPeriod(),
    items: [
      buildItem('bookings', bookingCount, limits.maxBookingsPerMonth),
      buildItem('employees', employeeCount, limits.maxEmployees),
      buildItem('services', serviceCount, limits.maxServices),
    ],
  };
}
