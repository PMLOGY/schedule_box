'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CompanyOnboardingStatus {
  onboarding_completed: boolean;
}

/**
 * Hook to check if the current company has completed onboarding.
 * Used by the dashboard page to conditionally redirect to /onboarding.
 */
export function useOnboardingRedirect(): {
  shouldRedirect: boolean;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'company', 'onboarding'],
    queryFn: async () => {
      const result = await apiClient.get<{ data: CompanyOnboardingStatus }>('/settings/company');
      return result.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) {
    return { shouldRedirect: false, isLoading: true };
  }

  if (data?.onboarding_completed === false) {
    return { shouldRedirect: true, isLoading: false };
  }

  return { shouldRedirect: false, isLoading: false };
}
