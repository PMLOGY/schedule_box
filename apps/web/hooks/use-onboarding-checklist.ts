/**
 * Onboarding Checklist Hook
 *
 * Tracks completion of 5 key setup items for new ScheduleBox users.
 * Fetches data from multiple API endpoints to determine completion status.
 */

import { useTranslations } from 'next-intl';
import { useCompanySettingsQuery, useWorkingHoursQuery } from '@/hooks/use-settings-query';
import { useServicesQuery } from '@/hooks/use-services-query';
import { useBookingsQuery } from '@/hooks/use-bookings-query';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
}

export interface OnboardingChecklistResult {
  items: ChecklistItem[];
  completedCount: number;
  totalCount: 5;
  isAllComplete: boolean;
  isLoading: boolean;
}

export function useOnboardingChecklist(): OnboardingChecklistResult {
  const t = useTranslations('onboarding.checklist');

  // Fetch all data needed to determine completion
  const { data: companySettings, isLoading: isLoadingCompany } = useCompanySettingsQuery();

  const { data: services, isLoading: isLoadingServices } = useServicesQuery();

  const { data: workingHours, isLoading: isLoadingWorkingHours } = useWorkingHoursQuery();

  const { data: bookingsData, isLoading: isLoadingBookings } = useBookingsQuery({
    page: 1,
    limit: 1,
  });

  const isLoading =
    isLoadingCompany || isLoadingServices || isLoadingWorkingHours || isLoadingBookings;

  // Determine completion for each item
  const companyProfileComplete = Boolean(
    companySettings &&
    companySettings.name &&
    companySettings.name.trim().length > 0 &&
    (companySettings.phone || companySettings.description),
  );

  const firstServiceAdded = Boolean(services && services.length > 0);

  const workingHoursSet = Boolean(workingHours && workingHours.length > 0);

  const firstBookingReceived = Boolean(
    bookingsData && bookingsData.data && bookingsData.data.length > 0,
  );

  // Simplified: notifications enabled if company has phone set (SMS readiness)
  const notificationsEnabled = Boolean(
    companySettings && companySettings.phone && companySettings.phone.trim().length > 0,
  );

  const items: ChecklistItem[] = [
    {
      id: 'company-profile',
      label: t('companyProfile.label'),
      description: t('companyProfile.description'),
      completed: companyProfileComplete,
      href: '/settings',
    },
    {
      id: 'first-service',
      label: t('firstService.label'),
      description: t('firstService.description'),
      completed: firstServiceAdded,
      href: '/services',
    },
    {
      id: 'working-hours',
      label: t('workingHours.label'),
      description: t('workingHours.description'),
      completed: workingHoursSet,
      href: '/settings',
    },
    {
      id: 'first-booking',
      label: t('firstBooking.label'),
      description: t('firstBooking.description'),
      completed: firstBookingReceived,
      href: '/bookings',
    },
    {
      id: 'notifications',
      label: t('notifications.label'),
      description: t('notifications.description'),
      completed: notificationsEnabled,
      href: '/settings',
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const isAllComplete = completedCount === 5;

  return {
    items,
    completedCount,
    totalCount: 5,
    isAllComplete,
    isLoading,
  };
}
