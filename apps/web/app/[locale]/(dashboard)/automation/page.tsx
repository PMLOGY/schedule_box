'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Wand2, History } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Link } from '@/lib/i18n/navigation';

type AutomationTriggerType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'booking_no_show'
  | 'payment_received'
  | 'customer_created'
  | 'review_received';

type AutomationActionType = 'send_email' | 'send_sms' | 'send_push';

interface AutomationRule {
  uuid: string;
  name: string;
  triggerType: AutomationTriggerType;
  actionType: AutomationActionType;
  delayMinutes: number;
  isActive: boolean;
  createdAt: string;
}

function formatDelay(minutes: number, t: ReturnType<typeof useTranslations>): string {
  if (minutes === 0) return t('delays.immediate');
  if (minutes < 60) return t('delays.minutes', { value: minutes });
  if (minutes < 1440) return t('delays.hours', { value: Math.floor(minutes / 60) });
  return t('delays.days', { value: Math.floor(minutes / 1440) });
}

export default function AutomationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('automation');

  const { data: rules, isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: AutomationRule[] }>('/automation/rules');
      return response.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (uuid: string) => {
      await apiClient.post(`/automation/rules/${uuid}/toggle`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (uuid: string) => {
      await apiClient.delete(`/automation/rules/${uuid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    },
  });

  const handleEdit = (uuid: string) => {
    router.push(`/automation/builder?ruleId=${uuid}`);
  };

  const handleDelete = (uuid: string, name: string) => {
    if (confirm(t('deleteConfirm', { name }))) {
      deleteMutation.mutate(uuid);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/automation/logs">
              <History className="mr-2 h-4 w-4" />
              {t('history')}
            </Link>
          </Button>
          <Button onClick={() => router.push('/automation/builder')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newAutomation')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      ) : !rules || rules.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center space-y-2">
            <Wand2 className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">{t('empty')}</p>
            <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <Card key={rule.uuid}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => toggleMutation.mutate(rule.uuid)}
                    disabled={toggleMutation.isPending}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    {t('trigger')}
                  </div>
                  <Badge variant="outline" className="font-normal">
                    {t(`triggers.${rule.triggerType}`)}
                  </Badge>
                </div>

                {rule.delayMinutes > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      {t('delay')}
                    </div>
                    <Badge variant="outline" className="font-normal">
                      {formatDelay(rule.delayMinutes, t)}
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                    {t('action')}
                  </div>
                  <Badge variant="outline" className="font-normal">
                    {t(`actions.${rule.actionType}`)}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(rule.uuid)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {t('edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(rule.uuid, rule.name)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
