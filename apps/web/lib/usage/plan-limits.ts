/**
 * Plan Limits Helper
 *
 * Reads subscription tier limits from PLAN_CONFIG (single source of truth
 * in @schedulebox/shared) and returns a typed PlanLimits object.
 *
 * This module NEVER redefines limits — it only adapts the shared config
 * into the shape needed by the usage service.
 */

import { PLAN_CONFIG, type SubscriptionPlan } from '@schedulebox/shared';

export interface PlanLimits {
  maxBookingsPerMonth: number;
  maxEmployees: number;
  maxServices: number;
}

/**
 * Get usage limits for a given subscription plan.
 *
 * @param plan - Subscription plan tier
 * @returns Typed limits object with booking, employee, and service caps
 */
export function getLimitsForPlan(plan: SubscriptionPlan): PlanLimits {
  const config = PLAN_CONFIG[plan];
  return {
    maxBookingsPerMonth: config.features.maxBookingsPerMonth,
    maxEmployees: config.features.maxEmployees,
    maxServices: config.features.maxServices,
  };
}

/**
 * Check if a limit value represents unlimited usage (Infinity).
 *
 * @param limit - The limit value to check
 * @returns true if the limit is Infinity (unlimited)
 */
export function isUnlimited(limit: number): boolean {
  return !isFinite(limit);
}
