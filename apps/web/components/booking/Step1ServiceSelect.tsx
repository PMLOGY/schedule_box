'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Clock, Coins } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useBookingWizard } from '@/stores/booking-wizard.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { UpsellingSuggestions } from '@/components/booking/UpsellingSuggestions';

interface Service {
  id: number;
  uuid: string;
  name: string;
  duration_minutes: number;
  price: string;
  currency: string;
  category_id: number | null;
  is_active: boolean;
}

interface Employee {
  id: number;
  uuid: string;
  name: string;
}

export function Step1ServiceSelect() {
  const t = useTranslations('booking.wizard.step1');
  const tCommon = useTranslations('common');
  const { data, updateData, nextStep } = useBookingWizard();
  const user = useAuthStore((s) => s.user);
  const isEmployee = user?.role === 'employee';

  // Fetch employee's own info to get their employee ID and UUID
  const { data: meData } = useQuery<{ id: number; uuid: string; name: string }>({
    queryKey: ['auth', 'me', 'employee'],
    queryFn: async () => {
      const res = await apiClient.get<{ id: number; uuid: string; name: string }>(
        '/auth/me/employee',
      );
      return res;
    },
    enabled: isEmployee,
  });

  // Fetch all active services (owner/manager) or employee's assigned services only
  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['services', { is_active: true, employee: isEmployee ? meData?.uuid : undefined }],
    queryFn: async () => {
      if (isEmployee && meData?.uuid) {
        // Fetch only services assigned to this employee
        const res = await apiClient.get<{ data: Service[] }>(`/employees/${meData.uuid}/services`);
        const list = Array.isArray(res) ? res : (res.data ?? []);
        return list;
      }
      const res = await apiClient.get<{ data: Service[] }>('/services', { is_active: true });
      return Array.isArray(res) ? res : res.data;
    },
    enabled: !isEmployee || !!meData?.uuid,
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['employees', data.serviceId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Employee[] }>('/employees', {
        service_id: data.serviceId,
      });
      return Array.isArray(res) ? res : res.data;
    },
    enabled: !!data.serviceId,
  });

  const handleServiceSelect = (service: Service) => {
    const updates: Record<string, unknown> = {
      serviceId: service.id,
      serviceName: service.name,
      serviceDuration: service.duration_minutes,
      servicePrice: `${service.price} ${service.currency}`,
    };
    // Auto-assign employee when an employee creates a booking (use numeric ID for availability API)
    if (isEmployee && meData) {
      updates.employeeId = meData.id;
      updates.employeeName = meData.name;
    }
    updateData(updates);
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees?.find((e) => e.id === parseInt(employeeId));
    updateData({
      employeeId: employee ? employee.id : undefined,
      employeeName: employee?.name,
    });
  };

  const handleContinue = () => {
    if (data.serviceId) {
      nextStep();
    }
  };

  if (isLoadingServices) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('noServices')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t('title')}</h2>
      </div>

      <div className="grid gap-4">
        {services.map((service) => (
          <Card
            key={service.id}
            className={cn(
              'cursor-pointer transition-colors hover:border-primary',
              data.serviceId === service.id && 'border-primary bg-primary/5',
            )}
            onClick={() => handleServiceSelect(service)}
          >
            <CardHeader>
              <CardTitle>{service.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {service.duration_minutes} {t('minutes')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  <span>
                    {service.price} {service.currency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Upselling Suggestions - loads async, never blocks flow */}
      <UpsellingSuggestions selectedServiceId={data.serviceId ?? null} />

      {data.serviceId && (
        <div className="space-y-4">
          {/* Employee selector — hidden for employees (auto-assigned to themselves) */}
          {!isEmployee && (
            <div className="space-y-2">
              <Label>{t('preferredEmployee')}</Label>
              <Select
                value={data.employeeId?.toString() || 'any'}
                onValueChange={handleEmployeeSelect}
                disabled={isLoadingEmployees}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('anyEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('anyEmployee')}</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleContinue} className="w-full">
            {tCommon('next')}
          </Button>
        </div>
      )}
    </div>
  );
}
