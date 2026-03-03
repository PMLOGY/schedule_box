/**
 * Payment Query Hooks
 *
 * TanStack Query hooks for fetching and managing payments data.
 * Provides hooks for list view, single payment detail, and refund mutation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@schedulebox/shared/types';

// ============================================================================
// TYPES
// ============================================================================

/** Payment list item as returned by GET /api/v1/payments */
export interface PaymentListItem {
  id: string; // UUID
  amount: string;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  gateway: 'comgate' | 'qrcomat' | 'cash' | 'bank_transfer' | 'gift_card';
  gateway_transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
  customer_name: string;
  service_name: string;
}

/** Payment detail as returned by GET /api/v1/payments/{id} */
export interface PaymentDetail {
  id: string; // UUID
  amount: string;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  gateway: 'comgate' | 'qrcomat' | 'cash' | 'bank_transfer' | 'gift_card';
  gateway_transaction_id: string | null;
  gateway_response: unknown;
  refund_amount: string | null;
  refund_reason: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
  booking: {
    id: string;
    status: string;
    start_time: string;
    end_time: string;
    service_name: string;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
  } | null;
}

interface PaymentsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  gateway?: string;
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// LIST QUERY
// ============================================================================

/**
 * Hook for fetching paginated payment list with filters
 * Used in table view on /payments page
 */
export function usePaymentsQuery(params: PaymentsQueryParams = {}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      return apiClient.get<PaginatedResponse<PaymentListItem>>(
        '/payments',
        params as Record<string, unknown>,
      );
    },
    staleTime: 30_000, // 30 seconds - payments can change frequently
  });
}

// ============================================================================
// DETAIL QUERY
// ============================================================================

/**
 * Hook for fetching single payment detail
 * Includes customer, booking, service, and invoice information
 */
export function usePaymentDetail(paymentId: string | null) {
  return useQuery({
    queryKey: ['payments', paymentId],
    queryFn: async () => {
      if (!paymentId) return null;
      return apiClient.get<PaymentDetail>(`/payments/${paymentId}`);
    },
    enabled: paymentId !== null,
    staleTime: 30_000,
  });
}

// ============================================================================
// REFUND MUTATION
// ============================================================================

/**
 * Hook for processing payment refund
 * POST /api/v1/payments/{id}/refund
 */
export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, amount }: { id: string; reason: string; amount?: number }) => {
      return apiClient.post(`/payments/${id}/refund`, { reason, amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}
