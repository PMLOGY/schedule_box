import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface EmployeeService {
  id: number;
  uuid: string;
  name: string;
  duration_minutes: number;
  price: string;
}

export interface Employee {
  id: number;
  uuid: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  color: string;
  is_active: boolean;
  services: EmployeeService[];
  created_at: string;
}

export function useEmployeesQuery() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      return apiClient.get<Employee[]>('/employees');
    },
    staleTime: 60_000,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; title?: string }) => {
      return apiClient.post('/employees', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      uuid,
      ...data
    }: {
      uuid: string;
      name?: string;
      email?: string;
      phone?: string;
      title?: string;
      is_active?: boolean;
    }) => {
      return apiClient.put(`/employees/${uuid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useAssignEmployeeServices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uuid, service_ids }: { uuid: string; service_ids: number[] }) => {
      return apiClient.put(`/employees/${uuid}/services`, { service_ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
