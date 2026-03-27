import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface PaymentProviderConfig {
  provider: string;
  is_active: boolean;
  test_mode: boolean;
  has_credentials: boolean;
  merchant_id: string | null;
}

export interface SavePaymentProviderInput {
  provider: 'comgate';
  merchant_id: string;
  secret: string;
  test_mode?: boolean;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch the current payment provider configuration for the authenticated company.
 * Returns provider status, test mode flag, and masked merchant ID.
 */
export function usePaymentProvider() {
  return useQuery({
    queryKey: ['payment-provider'],
    queryFn: async () => {
      const result = await apiClient.get<PaymentProviderConfig>('/settings/payment-provider');
      return result;
    },
    staleTime: 60_000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Save payment provider credentials.
 * PUT /api/v1/settings/payment-provider
 * Invalidates payment-provider query on success.
 * Shows toast on success/error via sonner.
 */
export function useSavePaymentProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SavePaymentProviderInput) => {
      return apiClient.put<PaymentProviderConfig>('/settings/payment-provider', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-provider'] });
      toast.success('Payment provider configured');
    },
    onError: (error) => {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to save payment provider');
    },
  });
}
