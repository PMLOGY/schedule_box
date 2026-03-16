'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

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
  const user = useAuthStore((s) => s.user);
  const hasCompany = !!user && user.role !== 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'company', 'onboarding'],
    queryFn: async () => {
      return apiClient.get<CompanyOnboardingStatus>('/settings/company');
    },
    staleTime: 60_000,
    retry: false,
    enabled: hasCompany,
  });

  if (isLoading) {
    return { shouldRedirect: false, isLoading: true };
  }

  if (data?.onboarding_completed === false) {
    return { shouldRedirect: true, isLoading: false };
  }

  return { shouldRedirect: false, isLoading: false };
}
