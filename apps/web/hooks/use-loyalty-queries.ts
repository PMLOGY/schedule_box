/**
 * Loyalty Query Hooks
 *
 * TanStack Query hooks for fetching and mutating loyalty data.
 * Provides hooks for programs, cards, rewards, tiers, and transactions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  LoyaltyProgram,
  LoyaltyCard,
  LoyaltyTransaction,
  Reward,
  LoyaltyTier,
  LoyaltyProgramCreate,
  LoyaltyProgramUpdate,
  LoyaltyCardCreate,
  RewardCreate,
  RewardUpdate,
  AddPoints,
  TierCreate,
  PaginatedResponse,
} from '@schedulebox/shared/types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const loyaltyKeys = {
  all: ['loyalty'] as const,
  program: () => [...loyaltyKeys.all, 'program'] as const,
  tiers: () => [...loyaltyKeys.all, 'tiers'] as const,
  cardsAll: () => [...loyaltyKeys.all, 'cards'] as const,
  cards: (params?: Record<string, unknown>) => [...loyaltyKeys.all, 'cards', params] as const,
  card: (id: string) => [...loyaltyKeys.all, 'cards', id] as const,
  rewardsAll: () => [...loyaltyKeys.all, 'rewards'] as const,
  rewards: (params?: Record<string, unknown>) => [...loyaltyKeys.all, 'rewards', params] as const,
  transactions: (cardId: string, params?: Record<string, unknown>) =>
    [...loyaltyKeys.all, 'transactions', cardId, params] as const,
};

// ============================================================================
// QUERY HOOKS (READ)
// ============================================================================

/**
 * Hook for fetching the company's loyalty program with tiers
 */
export function useLoyaltyProgram() {
  return useQuery({
    queryKey: loyaltyKeys.program(),
    queryFn: async () => {
      const response = await apiClient.get<LoyaltyProgram>('/loyalty/programs');
      return response;
    },
    staleTime: 60_000, // 1 minute - program settings change rarely
    retry: (failureCount, error) => {
      // Don't retry on 404 (no program exists yet)
      if (
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        (error as { statusCode: number }).statusCode === 404
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook for fetching paginated loyalty cards list
 */
export function useLoyaltyCards(params?: {
  page?: number;
  limit?: number;
  customer_id?: string;
  search?: string;
}) {
  const queryParams = params as Record<string, unknown> | undefined;
  return useQuery({
    queryKey: loyaltyKeys.cards(queryParams),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<LoyaltyCard>>(
        '/loyalty/cards',
        queryParams,
      );
      return response;
    },
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Hook for fetching a single loyalty card with tier progress
 */
export function useLoyaltyCard(id: string) {
  return useQuery({
    queryKey: loyaltyKeys.card(id),
    queryFn: async () => {
      const response = await apiClient.get<LoyaltyCard>(`/loyalty/cards/${id}`);
      return response;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Hook for fetching paginated rewards list
 */
export function useRewards(params?: { page?: number; limit?: number; is_active?: boolean }) {
  const queryParams = params as Record<string, unknown> | undefined;
  return useQuery({
    queryKey: loyaltyKeys.rewards(queryParams),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Reward>>(
        '/loyalty/rewards',
        queryParams,
      );
      return response;
    },
    staleTime: 30_000,
  });
}

/**
 * Hook for fetching transaction history for a loyalty card
 */
export function useTransactions(
  cardId: string,
  params?: { page?: number; limit?: number; type?: string },
) {
  const queryParams = params as Record<string, unknown> | undefined;
  return useQuery({
    queryKey: loyaltyKeys.transactions(cardId, queryParams),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<LoyaltyTransaction>>(
        `/loyalty/cards/${cardId}/transactions`,
        queryParams,
      );
      return response;
    },
    enabled: !!cardId,
    staleTime: 30_000,
  });
}

/**
 * Hook for fetching loyalty tiers
 */
export function useTiers() {
  return useQuery({
    queryKey: loyaltyKeys.tiers(),
    queryFn: async () => {
      const response = await apiClient.get<LoyaltyTier[]>('/loyalty/tiers');
      return response;
    },
    staleTime: 60_000,
  });
}

// ============================================================================
// MUTATION HOOKS (WRITE)
// ============================================================================

/**
 * Hook for creating a loyalty program
 */
export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LoyaltyProgramCreate) => {
      return apiClient.post<LoyaltyProgram>('/loyalty/programs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
    },
  });
}

/**
 * Hook for updating a loyalty program
 */
export function useUpdateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LoyaltyProgramUpdate) => {
      return apiClient.put<LoyaltyProgram>('/loyalty/programs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
    },
  });
}

/**
 * Hook for creating a reward
 */
export function useCreateReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RewardCreate) => {
      return apiClient.post<Reward>('/loyalty/rewards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.rewardsAll() });
    },
  });
}

/**
 * Hook for updating a reward
 */
export function useUpdateReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RewardUpdate }) => {
      return apiClient.put<Reward>(`/loyalty/rewards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.rewardsAll() });
    },
  });
}

/**
 * Hook for adding points to a loyalty card
 */
export function useAddPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, data }: { cardId: string; data: AddPoints }) => {
      return apiClient.post<LoyaltyCard>(`/loyalty/cards/${cardId}/add-points`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.card(variables.cardId) });
      queryClient.invalidateQueries({
        queryKey: loyaltyKeys.transactions(variables.cardId),
      });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.cardsAll() });
    },
  });
}

/**
 * Hook for redeeming a reward
 */
export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rewardId, cardId }: { rewardId: number; cardId: string }) => {
      return apiClient.post(`/loyalty/rewards/${rewardId}/redeem`, { card_id: cardId });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.card(variables.cardId) });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.rewardsAll() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.cardsAll() });
    },
  });
}

/**
 * Hook for creating a loyalty card (issuing to customer)
 */
export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LoyaltyCardCreate) => {
      return apiClient.post<LoyaltyCard>('/loyalty/cards', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.cardsAll() });
    },
  });
}

/**
 * Hook for creating a loyalty tier
 */
export function useCreateTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TierCreate) => {
      return apiClient.post<LoyaltyTier>('/loyalty/tiers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.tiers() });
    },
  });
}

/**
 * Hook for deleting a loyalty tier
 */
export function useDeleteTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tierId: number) => {
      return apiClient.delete(`/loyalty/tiers/${tierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.program() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.tiers() });
    },
  });
}
