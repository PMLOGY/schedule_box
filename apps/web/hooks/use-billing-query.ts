import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubscriptionPlan, BillingCycle, PlanFeatures } from '@schedulebox/shared';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface BillingPlan {
  key: SubscriptionPlan;
  name: string;
  price: number;
  priceAnnual: number;
  currency: string;
  features: PlanFeatures;
}

export interface CurrentSubscription {
  id: string;
  plan: SubscriptionPlan;
  planName: string;
  status: string;
  billingCycle: BillingCycle;
  priceAmount: string;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  daysUntilRenewal: number;
  pendingDowngrade: string | null;
  features: PlanFeatures | null;
  createdAt: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  amount: string;
  currency: string;
  status: string;
  pdfUrl: string | null;
  createdAt: string;
}

export interface BillingStatusResponse {
  subscriptionStatus: string | null;
  planName: string;
  activated: boolean;
  lastEventType: string | null;
}

export interface SubscribeResponse {
  redirectUrl: string;
  subscriptionUuid: string;
}

export interface UpgradeResponse {
  subscription?: {
    id: string;
    plan: string;
    status: string;
    priceAmount: string;
  };
  redirectUrl?: string;
  prorationAmount: number;
  charged: boolean;
}

export interface DowngradeResponse {
  subscription: {
    id: string;
    plan: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string;
  };
  pendingDowngrade: string;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all available billing plans with pricing and features.
 * Public endpoint - no auth required.
 */
export function useBillingPlans() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => {
      const result = await apiClient.get<{ plans: BillingPlan[] }>('/billing/plans');
      return result.plans;
    },
    staleTime: 300_000, // 5 minutes — plans rarely change
  });
}

/**
 * Fetch the current subscription for the authenticated company.
 * Returns null-like when company is on Free plan (404).
 */
export function useCurrentSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      try {
        const result = await apiClient.get<CurrentSubscription>('/billing/subscription');
        return result;
      } catch (error) {
        // 404 means no paid subscription — company is on Free plan
        const apiError = error as { statusCode?: number };
        if (apiError.statusCode === 404) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

/**
 * Fetch invoice history for the current company.
 * Returns empty array when no invoices exist.
 */
export function useBillingInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => {
      try {
        const result = await apiClient.get<{ invoices: BillingInvoice[] }>('/billing/invoices');
        return result.invoices;
      } catch (error) {
        // If invoices endpoint not yet implemented, return empty
        const apiError = error as { statusCode?: number };
        if (apiError.statusCode === 404) {
          return [];
        }
        throw error;
      }
    },
    staleTime: 120_000,
  });
}

/**
 * Poll billing status after Comgate payment return.
 * Only enabled when `enabled` is true (e.g., ?payment=pending in URL).
 * Polls every 2 seconds.
 */
export function useBillingStatus(enabled: boolean) {
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: async () => {
      const result = await apiClient.get<BillingStatusResponse>('/billing/status');
      return result;
    },
    refetchInterval: enabled ? 2000 : false,
    enabled,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Subscribe to a paid plan. Returns a redirect URL to Comgate payment page.
 * On success, redirect the user to `result.redirectUrl` via window.location.href.
 */
export function useSubscribe() {
  return useMutation({
    mutationFn: async (data: { plan: SubscriptionPlan; billingCycle?: BillingCycle }) => {
      return apiClient.post<SubscribeResponse>('/billing/subscribe', data);
    },
  });
}

/**
 * Upgrade to a higher plan.
 *
 * Response handling:
 * - If `result.charged === true`: proration was charged server-side via recurring token.
 *   Show success toast and invalidate subscription query. No redirect needed.
 * - If `result.redirectUrl`: redirect to Comgate. Only happens when subscriber has no
 *   existing recurring token (rare: e.g., upgrading during trial).
 */
export function useUpgrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { plan: SubscriptionPlan }) => {
      return apiClient.post<UpgradeResponse>('/billing/upgrade', data);
    },
    onSuccess: (result) => {
      if (result.charged) {
        // Server-side charge succeeded — refetch subscription data
        queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
      }
      // If result.redirectUrl exists, the component handles the redirect
    },
  });
}

/**
 * Downgrade to a lower plan. Takes effect at end of current billing period.
 */
export function useDowngrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { plan: SubscriptionPlan }) => {
      return apiClient.post<DowngradeResponse>('/billing/downgrade', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] });
    },
  });
}
