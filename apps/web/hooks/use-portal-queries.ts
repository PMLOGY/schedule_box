import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface PortalBooking {
  uuid: string;
  status: string;
  start_time: string;
  end_time: string;
  service_name: string;
  employee_name: string | null;
  company_name: string;
  company_slug: string;
  price: string;
  currency: string;
  created_at: string;
  has_review: boolean;
}

interface PortalProfile {
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
}

interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export function usePortalBookings(params: { status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['portal', 'bookings', params],
    queryFn: () =>
      apiClient.get<{ data: PortalBooking[]; meta: PaginatedMeta }>(
        '/portal/bookings',
        params as Record<string, unknown>,
      ),
    staleTime: 30_000,
  });
}

export function usePortalProfile() {
  return useQuery({
    queryKey: ['portal', 'profile'],
    queryFn: () => apiClient.get<PortalProfile>('/portal/profile'),
    staleTime: 300_000,
  });
}

export function useUpdatePortalProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; phone?: string }) => apiClient.put('/portal/profile', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'profile'] }),
  });
}
