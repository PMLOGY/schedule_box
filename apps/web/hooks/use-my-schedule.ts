/**
 * Hooks for employee self-service schedule endpoints.
 *
 * Provides TanStack Query hooks for:
 * - Working hours (GET + PUT)
 * - Schedule overrides / day-off requests (GET + POST)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkingHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface ScheduleOverride {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_day_off: boolean;
  reason: string | null;
  created_at: string;
}

// ============================================================================
// WORKING HOURS
// ============================================================================

export function useMyWorkingHours() {
  return useQuery({
    queryKey: ['me', 'working-hours'],
    queryFn: () => apiClient.get<WorkingHour[]>('/employees/me/working-hours'),
    staleTime: 300_000, // 5 min
  });
}

export function useUpdateMyWorkingHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkingHour[]) =>
      apiClient.put('/employees/me/working-hours', { hours: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'working-hours'] }),
  });
}

// ============================================================================
// SCHEDULE OVERRIDES
// ============================================================================

export function useMyScheduleOverrides() {
  return useQuery({
    queryKey: ['me', 'schedule-overrides'],
    queryFn: () => apiClient.get<ScheduleOverride[]>('/employees/me/schedule-overrides'),
    staleTime: 60_000, // 1 min
  });
}

export function useCreateScheduleOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date: string;
      is_day_off: boolean;
      reason?: string;
      start_time?: string;
      end_time?: string;
    }) => apiClient.post('/employees/me/schedule-overrides', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'schedule-overrides'] }),
  });
}
