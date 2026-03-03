/**
 * Hook to get the current user's employee record.
 *
 * Only enabled for users with the 'employee' role.
 * Returns employee UUID, name, email, phone, title, avatar_url.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export interface EmployeeRecord {
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  avatar_url: string | null;
}

export function useCurrentEmployee() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['me', 'employee'],
    queryFn: () => apiClient.get<EmployeeRecord>('/auth/me/employee'),
    enabled: user?.role === 'employee',
    staleTime: 300_000, // 5 min - rarely changes
  });
}
