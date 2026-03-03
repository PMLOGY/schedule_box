import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ResourceType {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Resource {
  uuid: string;
  name: string;
  description: string | null;
  quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  resource_type: {
    id: number;
    name: string;
    description: string | null;
  } | null;
}

export function useResourceTypesQuery() {
  return useQuery({
    queryKey: ['resource-types'],
    queryFn: async () => {
      return apiClient.get<ResourceType[]>('/resource-types');
    },
    staleTime: 60_000,
  });
}

export function useResourcesQuery() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      return apiClient.get<Resource[]>('/resources');
    },
    staleTime: 60_000,
  });
}

export function useCreateResourceType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiClient.post('/resource-types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-types'] });
    },
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      resource_type_id?: number;
      quantity?: number;
    }) => {
      return apiClient.post('/resources', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      uuid,
      ...data
    }: {
      uuid: string;
      name?: string;
      description?: string;
      resource_type_id?: number;
      quantity?: number;
      is_active?: boolean;
    }) => {
      return apiClient.put(`/resources/${uuid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      return apiClient.delete(`/resources/${uuid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
