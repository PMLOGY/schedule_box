import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// --- Response interfaces matching API route return shapes ---

export interface PaymentMethodData {
  gateway: string;
  count: number;
  totalAmount: number;
  percentage: string;
}

export interface TopServiceData {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  totalRevenue: number;
}

export interface PeakHourData {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface EmployeeUtilizationData {
  employeeId: string;
  employeeName: string;
  bookingCount: number;
  totalRevenue: number;
  occupancyPercent: number;
}

export interface CancellationData {
  date: string;
  total: number;
  cancelled: number;
  noShows: number;
  cancelRate: number;
  noShowRate: number;
}

export interface CustomerRetentionData {
  repeatBooking: {
    repeatRate: number;
    totalCustomers: number;
    repeatCustomers: number;
  };
  churn: {
    churned: number;
    atRisk: number;
    active: number;
  };
  clvDistribution: Array<{
    range: string;
    count: number;
  }>;
}

// --- Hooks ---

export function usePaymentMethodAnalytics(days: number) {
  return useQuery({
    queryKey: ['analytics', 'payment-methods', days],
    queryFn: async () => {
      const data = await apiClient.get<PaymentMethodData[]>('/analytics/payment-methods', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopServicesAnalytics(days: number) {
  return useQuery({
    queryKey: ['analytics', 'top-services', days],
    queryFn: async () => {
      const data = await apiClient.get<TopServiceData[]>('/analytics/top-services', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePeakHoursAnalytics(days: number) {
  return useQuery({
    queryKey: ['analytics', 'peak-hours', days],
    queryFn: async () => {
      const data = await apiClient.get<PeakHourData[]>('/analytics/peak-hours', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployeeUtilization(days: number) {
  return useQuery({
    queryKey: ['analytics', 'employees', days],
    queryFn: async () => {
      const data = await apiClient.get<EmployeeUtilizationData[]>('/analytics/employees', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCancellationAnalytics(days: number) {
  return useQuery({
    queryKey: ['analytics', 'cancellations', days],
    queryFn: async () => {
      const data = await apiClient.get<CancellationData[]>('/analytics/cancellations', { days });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomerRetention() {
  return useQuery({
    queryKey: ['analytics', 'customer-retention'],
    queryFn: async () => {
      const data = await apiClient.get<CustomerRetentionData>('/analytics/customer-retention');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
