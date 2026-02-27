/**
 * Billing Types & Configuration
 *
 * Single source of truth for subscription plan pricing, features,
 * state machine transitions, and billing utilities.
 *
 * Pricing from product documentation (schedulebox_complete_documentation.md):
 * - Free: 0 CZK/month
 * - Essential: 490 CZK/month (annual: 4,900 CZK = 10 months)
 * - Growth: 1,490 CZK/month (annual: 14,900 CZK = 10 months)
 * - AI-Powered: 2,990 CZK/month (annual: 29,900 CZK = 10 months)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SubscriptionPlan = 'free' | 'essential' | 'growth' | 'ai_powered';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanFeatures {
  maxBookingsPerMonth: number;
  maxEmployees: number;
  maxServices: number;
  aiFeatures: boolean;
}

export interface PlanConfig {
  name: string;
  price: number; // Monthly price in CZK
  priceAnnual: number; // Annual price in CZK (2 months free)
  currency: string;
  features: PlanFeatures;
}

// ============================================================================
// PLAN CONFIGURATION (SINGLE SOURCE OF TRUTH)
// ============================================================================

export const PLAN_CONFIG: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    currency: 'CZK',
    features: {
      maxBookingsPerMonth: 50,
      maxEmployees: 1,
      maxServices: 5,
      aiFeatures: false,
    },
  },
  essential: {
    name: 'Essential',
    price: 490,
    priceAnnual: 4900,
    currency: 'CZK',
    features: {
      maxBookingsPerMonth: 500,
      maxEmployees: 3,
      maxServices: 20,
      aiFeatures: false,
    },
  },
  growth: {
    name: 'Growth',
    price: 1490,
    priceAnnual: 14900,
    currency: 'CZK',
    features: {
      maxBookingsPerMonth: 2000,
      maxEmployees: 10,
      maxServices: 100,
      aiFeatures: true,
    },
  },
  ai_powered: {
    name: 'AI-Powered',
    price: 2990,
    priceAnnual: 29900,
    currency: 'CZK',
    features: {
      maxBookingsPerMonth: Infinity,
      maxEmployees: Infinity,
      maxServices: Infinity,
      aiFeatures: true,
    },
  },
} as const;

// ============================================================================
// SUBSCRIPTION STATE MACHINE
// ============================================================================

/**
 * Valid state transitions for the subscription lifecycle:
 *
 * trialing  -> active      (trial ends + payment succeeds)
 * trialing  -> expired     (trial ends + no payment method)
 * active    -> active      (renewal succeeds, new period)
 * active    -> past_due    (renewal fails)
 * active    -> cancelled   (user cancels, takes effect at period end)
 * past_due  -> active      (retry payment succeeds)
 * past_due  -> expired     (14 days without successful payment)
 * cancelled -> expired     (period end reached)
 * expired   -> []          (terminal state)
 */
export const VALID_SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  trialing: ['active', 'expired'],
  active: ['active', 'past_due', 'cancelled'],
  past_due: ['active', 'expired'],
  cancelled: ['expired'],
  expired: [],
};

/**
 * Check if a subscription status transition is valid
 */
export function isValidTransition(
  currentStatus: SubscriptionStatus,
  newStatus: SubscriptionStatus,
): boolean {
  const allowedTransitions = VALID_SUBSCRIPTION_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

// ============================================================================
// BILLING HELPERS
// ============================================================================

/**
 * Get VAT rate based on company country.
 * Czech Republic: 21%, Slovakia: 20%, default: 21%.
 *
 * @param country ISO 3166-1 alpha-2 country code
 * @returns VAT rate as a percentage (e.g., 21 for 21%)
 */
export function getVatRate(country: string): number {
  switch (country) {
    case 'CZ':
      return 21;
    case 'SK':
      return 20;
    default:
      return 21;
  }
}

/**
 * Calculate prorated amount for a mid-cycle plan change (upgrade).
 *
 * Uses a 30-day month approximation. Only charges the positive
 * difference for the remaining days in the current period.
 *
 * @param currentPlanPrice Current plan's monthly price in CZK
 * @param newPlanPrice New plan's monthly price in CZK
 * @param currentPeriodEnd End date of the current billing period
 * @returns Prorated amount to charge (0 if downgrade or period ended)
 */
export function calculateProration(
  currentPlanPrice: number,
  newPlanPrice: number,
  currentPeriodEnd: Date,
): number {
  const now = new Date();
  const msInDay = 1000 * 60 * 60 * 24;
  const remainingDays = Math.max(
    0,
    Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / msInDay),
  );
  const totalDaysInPeriod = 30;
  const dailyDifference = (newPlanPrice - currentPlanPrice) / totalDaysInPeriod;
  return Math.max(0, Math.round(dailyDifference * remainingDays * 100) / 100);
}

/**
 * Get the price for a plan based on billing cycle
 */
export function getPlanPrice(plan: SubscriptionPlan, cycle: BillingCycle): number {
  const config = PLAN_CONFIG[plan];
  return cycle === 'annual' ? config.priceAnnual : config.price;
}

/**
 * Dunning configuration: maximum days before subscription expires
 * after entering past_due status
 */
export const DUNNING_GRACE_PERIOD_DAYS = 14;

/**
 * Number of retry attempts for failed recurring payments
 * during the dunning grace period
 */
export const DUNNING_MAX_RETRIES = 3;

/**
 * Trial period duration in days
 */
export const TRIAL_PERIOD_DAYS = 14;
