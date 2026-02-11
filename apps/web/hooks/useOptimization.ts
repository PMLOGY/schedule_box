/**
 * AI Optimization TanStack Query Hooks
 *
 * Hooks for upselling, dynamic pricing, capacity forecasting, and reminder timing.
 * All hooks follow the same pattern: POST to optimization endpoints with appropriate
 * stale times and retry settings per use case.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface UpsellRecommendation {
  service_id: number;
  confidence: number;
  reason: string;
}

export interface UpsellResponse {
  recommendations: UpsellRecommendation[];
  model_version: string;
  fallback: boolean;
}

export interface DynamicPricingResponse {
  service_id: number;
  optimal_price: number;
  confidence: number;
  constrained: boolean;
  model_version: string;
  fallback: boolean;
}

export interface CapacityForecastEntry {
  datetime: string;
  predicted_bookings: number;
  lower_bound: number;
  upper_bound: number;
  utilization_level: 'low' | 'medium' | 'high';
}

export interface CapacityScheduleSuggestion {
  datetime: string;
  type: 'extend_hours' | 'reduce_hours' | 'add_employee';
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CapacityForecastResponse {
  forecast: CapacityForecastEntry[];
  suggestions: CapacityScheduleSuggestion[];
  model_version: string;
  fallback: boolean;
}

export interface ReminderTimingResponse {
  customer_id: number;
  minutes_before: number;
  expected_open_rate: number;
  confidence: number;
  model_version: string;
  fallback: boolean;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const optimizationKeys = {
  all: ['ai', 'optimization'] as const,
  upselling: (serviceId: number | null) =>
    [...optimizationKeys.all, 'upselling', serviceId] as const,
  pricing: (serviceId: number, hourOfDay?: number, dayOfWeek?: number) =>
    [...optimizationKeys.all, 'pricing', serviceId, hourOfDay, dayOfWeek] as const,
  capacity: (companyId: number, daysAhead: number) =>
    [...optimizationKeys.all, 'capacity', companyId, daysAhead] as const,
  reminderTiming: (customerId: number, channel: string) =>
    [...optimizationKeys.all, 'reminder-timing', customerId, channel] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching upselling recommendations during booking flow.
 * Only fetches when a service is selected (enabled: !!serviceId).
 * Uses short stale time (1 min) since recommendations are context-dependent.
 * Does NOT retry on failure - uses fallback instead (non-blocking).
 */
export function useUpselling(serviceId: number | null, customerHistory?: number[]) {
  return useQuery<UpsellResponse>({
    queryKey: optimizationKeys.upselling(serviceId),
    queryFn: async () => {
      return apiClient.post<UpsellResponse>('/ai/optimization/upselling', {
        customer_id: 0,
        current_service_id: serviceId,
        customer_history: customerHistory,
      });
    },
    enabled: !!serviceId,
    staleTime: 60_000, // 1 minute - recommendations don't change rapidly
    retry: false, // Use fallback, don't retry AI calls
  });
}

/**
 * Hook for fetching dynamic pricing for a specific service and context.
 * Provides sensible defaults for time parameters.
 * Longer stale time (5 min) since pricing changes slowly.
 */
export function useDynamicPricing(
  serviceId: number,
  priceMin: number,
  priceMax: number,
  options?: {
    hourOfDay?: number;
    dayOfWeek?: number;
    utilization?: number;
    basePrice?: number;
  },
) {
  const hourOfDay = options?.hourOfDay ?? new Date().getHours();
  const dayOfWeek = options?.dayOfWeek ?? new Date().getDay();
  const utilization = options?.utilization ?? 0.5;

  return useQuery<DynamicPricingResponse>({
    queryKey: optimizationKeys.pricing(serviceId, hourOfDay, dayOfWeek),
    queryFn: async () => {
      return apiClient.post<DynamicPricingResponse>('/ai/optimization/pricing', {
        service_id: serviceId,
        price_min: priceMin,
        price_max: priceMax,
        base_price: options?.basePrice,
        hour_of_day: hourOfDay,
        day_of_week: dayOfWeek,
        utilization,
      });
    },
    staleTime: 300_000, // 5 minutes - pricing changes slowly
  });
}

/**
 * Hook for fetching capacity demand forecast for the next N days.
 * Longest stale time (10 min) since forecast is relatively stable.
 */
export function useCapacityForecast(
  companyId: number,
  daysAhead: number = 7,
  currentCapacity: number = 8,
) {
  return useQuery<CapacityForecastResponse>({
    queryKey: optimizationKeys.capacity(companyId, daysAhead),
    queryFn: async () => {
      return apiClient.post<CapacityForecastResponse>('/ai/optimization/capacity', {
        company_id: companyId,
        days_ahead: daysAhead,
        current_capacity: currentCapacity,
      });
    },
    staleTime: 600_000, // 10 minutes - forecast is relatively stable
  });
}

/**
 * Hook for fetching optimal reminder timing for a customer.
 * Only fetches when customerId is provided.
 */
export function useReminderTiming(customerId: number, channel: 'email' | 'sms' | 'push' = 'email') {
  return useQuery<ReminderTimingResponse>({
    queryKey: optimizationKeys.reminderTiming(customerId, channel),
    queryFn: async () => {
      return apiClient.post<ReminderTimingResponse>('/ai/optimization/reminder-timing', {
        customer_id: customerId,
        notification_channel: channel,
      });
    },
    enabled: !!customerId,
    staleTime: 300_000, // 5 minutes
  });
}
