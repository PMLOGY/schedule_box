'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: string; // 'bookings' | 'employees' | 'services'
  current: number;
  limit: number;
  plan: string;
}

interface UpgradeModalState {
  open: boolean;
  resource: string;
  current: number;
  limit: number;
  plan: string;
}

// ============================================================================
// PLAN COMPARISON DATA
// ============================================================================

/**
 * Static plan limits for the comparison table.
 * Matches PLAN_CONFIG from @schedulebox/shared.
 */
const PLAN_TIERS = [
  { key: 'free', bookings: 50, employees: 1, services: 5 },
  { key: 'essential', bookings: 500, employees: 3, services: 20 },
  { key: 'growth', bookings: 2000, employees: 10, services: 100 },
  { key: 'ai_powered', bookings: Infinity, employees: Infinity, services: Infinity },
] as const;

function formatLimit(value: number): string {
  return isFinite(value) ? String(value) : '\u221E'; // Infinity symbol
}

// ============================================================================
// UPGRADE MODAL COMPONENT
// ============================================================================

export function UpgradeModal({
  open,
  onOpenChange,
  resource,
  current,
  limit,
  plan,
}: UpgradeModalProps) {
  const t = useTranslations('usage');

  const resourceKey = (resource || 'bookings') as 'bookings' | 'employees' | 'services';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle>{t('upgradeModal.title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t(`upgradeModal.description.${resourceKey}`, {
              current: String(current),
              limit: String(limit),
              plan: t(`widget.plan.${plan as 'free' | 'essential' | 'growth' | 'ai_powered'}`),
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Plan comparison table */}
        <div className="mt-2">
          <p className="text-sm font-medium mb-2">{t('upgradeModal.comparePlans')}</p>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium" />
                  <th className="px-3 py-2 text-center font-medium">
                    {t('upgradeModal.bookingsPerMonth')}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t('upgradeModal.employeesLimit')}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t('upgradeModal.servicesLimit')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLAN_TIERS.map((tier) => (
                  <tr key={tier.key} className={tier.key === plan ? 'bg-muted/30 font-medium' : ''}>
                    <td className="px-3 py-1.5 font-medium">
                      {t(`widget.plan.${tier.key}`)}
                      {tier.key === plan && (
                        <span className="ml-1 text-xs text-muted-foreground">*</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">{formatLimit(tier.bookings)}</td>
                    <td className="px-3 py-1.5 text-center">{formatLimit(tier.employees)}</td>
                    <td className="px-3 py-1.5 text-center">{formatLimit(tier.services)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('upgradeModal.close')}
          </Button>
          <Button asChild>
            <Link href={'/settings/billing' as Parameters<typeof Link>[0]['href']}>
              {t('upgradeModal.viewPlans')}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HOOK: useUpgradeModal
// ============================================================================

/**
 * Hook for managing the upgrade modal state.
 * Can be used in any component to show the upgrade prompt.
 *
 * Usage:
 * ```tsx
 * const { open, resource, current, limit, plan, showUpgradeModal, onOpenChange } = useUpgradeModal();
 *
 * // In error handler:
 * if (isLimitError(error)) {
 *   showUpgradeModal(error.details);
 * }
 *
 * // In JSX:
 * <UpgradeModal open={open} onOpenChange={onOpenChange} resource={resource} current={current} limit={limit} plan={plan} />
 * ```
 */
export function useUpgradeModal() {
  const [state, setState] = useState<UpgradeModalState>({
    open: false,
    resource: '',
    current: 0,
    limit: 0,
    plan: 'free',
  });

  const showUpgradeModal = (details: {
    resource: string;
    current: number;
    limit: number;
    plan: string;
  }) => {
    setState({ open: true, ...details });
  };

  const hideUpgradeModal = () => {
    setState((prev) => ({ ...prev, open: false }));
  };

  return {
    ...state,
    showUpgradeModal,
    hideUpgradeModal,
    onOpenChange: (open: boolean) => {
      if (!open) hideUpgradeModal();
    },
  };
}

// ============================================================================
// UTILITY: isLimitError
// ============================================================================

/**
 * Type guard to check if an error is a 402 PLAN_LIMIT_EXCEEDED API error.
 *
 * Can be used in React Query `onError` handlers or mutation error handling
 * to detect when a plan limit has been exceeded and show the upgrade modal.
 *
 * @param error - The error from an API call
 * @returns true if the error is a plan limit exceeded error with resource details
 */
export function isLimitError(error: unknown): error is {
  statusCode: number;
  code: string;
  details: { resource: string; current: number; limit: number; plan: string };
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as { statusCode: number }).statusCode === 402 &&
    'code' in error &&
    (error as { code: string }).code === 'PLAN_LIMIT_EXCEEDED'
  );
}
