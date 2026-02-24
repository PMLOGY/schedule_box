'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Database, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';

interface DemoDataStatus {
  has_demo_data: boolean;
}

/**
 * DemoDataCard
 *
 * Shown on the dashboard between OnboardingChecklist and DashboardGrid.
 * Offers two states:
 * - No demo data: prompt to load Beauty Studio Praha sample data
 * - Demo data active: amber banner with option to remove
 */
export function DemoDataCard() {
  const t = useTranslations('onboarding.demoData');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: demoStatus, isLoading } = useQuery({
    queryKey: ['onboarding', 'demo-data'],
    queryFn: async () => {
      // apiClient auto-unwraps the { data: ... } envelope
      return apiClient.get<DemoDataStatus>('/onboarding/demo-data');
    },
    staleTime: 60_000,
  });

  const loadMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/onboarding/demo-data', {});
    },
    onSuccess: () => {
      // Invalidate all data queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'demo-data'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete('/onboarding/demo-data');
    },
    onSuccess: () => {
      setShowRemoveDialog(false);
      // Invalidate all data queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'demo-data'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted || isLoading) return null;

  const hasDemoData = demoStatus?.has_demo_data === true;

  return (
    <>
      {hasDemoData ? (
        // State 2: Demo data is active
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {t('activeBanner')} — {t('activeCompany')}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-900"
            onClick={() => setShowRemoveDialog(true)}
            disabled={removeMutation.isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t('removeButton')}
          </Button>
        </div>
      ) : (
        // State 1: No demo data loaded
        <Card className="border-dashed border-border bg-muted/50">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Database className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('promptTitle')}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('promptDescription')}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">{t('info')}</p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => loadMutation.mutate()}
              disabled={loadMutation.isPending}
            >
              {loadMutation.isPending ? t('loadingButton') : t('loadButton')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Remove confirmation dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('removeButton')}</DialogTitle>
            <DialogDescription>{t('removeConfirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
              disabled={removeMutation.isPending}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? '...' : t('removeButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
