import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface AdminStats {
  total_companies: number;
  total_users: number;
  total_bookings: number;
  total_revenue: string;
  new_companies_30d: number;
  bookings_7d: number;
}

interface AdminCompany {
  uuid: string;
  name: string;
  slug: string;
  email: string;
  subscription_plan: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
  booking_count: number;
  revenue: string;
}

interface AdminUser {
  uuid: string;
  email: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string;
  role: string;
  company_name: string | null;
  company_uuid: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient.get<AdminStats>('/admin/stats'),
    staleTime: 60_000,
  });
}

export function useAdminCompanies(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'companies', params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AdminCompany>>(
        '/admin/companies',
        params as Record<string, unknown>,
      ),
    staleTime: 30_000,
  });
}

export function useAdminUsers(
  params: { page?: number; limit?: number; role?: string; search?: string } = {},
) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () =>
      apiClient.get<PaginatedResponse<AdminUser>>(
        '/admin/users',
        params as Record<string, unknown>,
      ),
    staleTime: 30_000,
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { uuid: string; is_active: boolean }) => apiClient.put('/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export function useToggleCompanyActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { uuid: string; is_active: boolean }) =>
      apiClient.put('/admin/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}
