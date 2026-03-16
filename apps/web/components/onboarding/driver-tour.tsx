'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

const TOUR_KEY_PREFIX = 'sb_tour_completed_';

interface CompanyOnboardingStatus {
  onboarding_completed: boolean;
  uuid: string;
}

/**
 * DashboardTour
 *
 * Driver.js contextual tooltip tour for the dashboard.
 * Runs ONCE on first visit after onboarding is complete — never repeats.
 * Detection uses localStorage key `sb_tour_completed_{companyUuid}`.
 *
 * Renders nothing visually — only triggers the driver.js overlay.
 */
export function DashboardTour() {
  const t = useTranslations('onboarding.tour');
  const hasStarted = useRef(false);
  const user = useAuthStore((s) => s.user);
  const hasCompany = !!user && user.role !== 'admin';

  const { data: companyData } = useQuery({
    queryKey: ['settings', 'company', 'tour-check'],
    queryFn: async () => {
      return apiClient.get<CompanyOnboardingStatus>('/settings/company');
    },
    staleTime: 120_000,
    enabled: hasCompany,
  });

  useEffect(() => {
    // Only run once per mount
    if (hasStarted.current) return;

    // Must have company data
    if (!companyData) return;

    // Only run after onboarding is complete
    if (!companyData.onboarding_completed) return;

    // Check localStorage — tour already completed for this company
    const tourKey = `${TOUR_KEY_PREFIX}${companyData.uuid}`;
    if (typeof window !== 'undefined' && localStorage.getItem(tourKey) === 'true') {
      return;
    }

    hasStarted.current = true;

    // Small delay to let the dashboard fully render
    const timer = setTimeout(() => {
      const driverInstance = driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        nextBtnText: t('nextBtn'),
        prevBtnText: t('prevBtn'),
        doneBtnText: t('doneBtn'),
        animate: true,
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        popoverClass: 'schedulebox-tour-popover',
        steps: [
          {
            // Step 1: Sidebar navigation
            element:
              'nav[aria-label="Dashboard sidebar"] nav, aside[aria-label="Dashboard sidebar"]',
            popover: {
              title: t('navigation.title'),
              description: t('navigation.description'),
              side: 'right',
              align: 'start',
            },
          },
          {
            // Step 2: Stats / DashboardGrid area
            element: 'main .grid',
            popover: {
              title: t('overview.title'),
              description: t('overview.description'),
              side: 'bottom',
              align: 'start',
            },
          },
          {
            // Step 3: Quick actions card
            element: '[data-quick-actions]',
            popover: {
              title: t('quickActions.title'),
              description: t('quickActions.description'),
              side: 'top',
              align: 'start',
            },
          },
        ],
        onDestroyed: () => {
          // Mark tour as completed in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(tourKey, 'true');
          }
        },
        onCloseClick: () => {
          // Mark tour as completed when closed early
          if (typeof window !== 'undefined') {
            localStorage.setItem(tourKey, 'true');
          }
          driverInstance.destroy();
        },
      });

      driverInstance.drive();
    }, 500);

    return () => clearTimeout(timer);
  }, [companyData, t]);

  // Renders nothing — tour is overlay-based
  return null;
}
