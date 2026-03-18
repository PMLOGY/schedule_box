'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MaintenanceState {
  enabled: boolean;
  message: string | null;
}

function useMaintenanceState() {
  return useQuery({
    queryKey: ['admin', 'maintenance'],
    queryFn: () => apiClient.get<MaintenanceState>('/admin/maintenance'),
    staleTime: 10_000,
  });
}

export default function AdminMaintenancePage() {
  const t = useTranslations('admin.maintenance');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const { data, isLoading } = useMaintenanceState();
  const [message, setMessage] = useState('');

  // Sync message from server state
  useEffect(() => {
    if (data?.message) {
      setMessage(data.message);
    }
  }, [data?.message]);

  const toggleMutation = useMutation({
    mutationFn: (payload: { enabled: boolean; message?: string }) =>
      apiClient.put<MaintenanceState>('/admin/maintenance', payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'maintenance'] });
      toast.success(result.enabled ? t('enabled') : t('disabled'));
    },
    onError: () => toast.error(t('toggleError')),
  });

  const handleToggle = (enabled: boolean) => {
    toggleMutation.mutate({
      enabled,
      message: message || undefined,
    });
  };

  const handleSaveMessage = () => {
    if (!data) return;
    toggleMutation.mutate({
      enabled: data.enabled,
      message: message || undefined,
    });
  };

  const isActive = data?.enabled ?? false;

  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-4">
        <PageHeader title={t('title')} />
      </Card>

      {/* Status indicator */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-base">{t('status')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">{tCommon('loading')}</div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
              />
              <Badge variant={isActive ? 'destructive' : 'default'}>
                {isActive ? t('statusMaintenance') : t('statusNormal')}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toggle control */}
      <Card variant="glass">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">{t('enableToggle')}</Label>
                {isActive && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{t('warning')}</span>
                  </div>
                )}
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={isLoading || toggleMutation.isPending}
              />
            </div>

            {!isActive && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200">
                <AlertTriangle className="mb-1 inline h-4 w-4" /> {t('warning')}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="maintenance-message">{t('customMessage')}</Label>
              <Textarea
                id="maintenance-message"
                placeholder={t('customMessagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {data && (
              <Button
                onClick={handleSaveMessage}
                disabled={toggleMutation.isPending}
                variant="outline"
              >
                {toggleMutation.isPending ? t('saving') : t('save')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
