'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/shared/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

interface FeatureFlag {
  id: number;
  name: string;
  description: string | null;
  global_enabled: boolean;
  created_at: string;
  updated_at: string;
  override_count: number;
}

interface FlagOverride {
  id: number;
  company_id: number;
  company_name: string;
  company_uuid: string;
  enabled: boolean;
  created_at: string;
}

function useFeatureFlags() {
  return useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => apiClient.get<FeatureFlag[]>('/admin/feature-flags'),
    staleTime: 30_000,
  });
}

function useFlagOverrides(flagId: number | null) {
  return useQuery({
    queryKey: ['admin', 'feature-flags', flagId, 'overrides'],
    queryFn: () => apiClient.get<FlagOverride[]>(`/admin/feature-flags/${flagId}/overrides`),
    enabled: flagId !== null,
  });
}

export default function AdminFeatureFlagsPage() {
  const t = useTranslations('admin.featureFlags');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const [expandedFlagId, setExpandedFlagId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', globalEnabled: false });

  const { data: flags, isLoading } = useFeatureFlags();
  const { data: overrides } = useFlagOverrides(expandedFlagId);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; globalEnabled: boolean }) =>
      apiClient.post<FeatureFlag>('/admin/feature-flags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      setCreateOpen(false);
      setCreateForm({ name: '', description: '', globalEnabled: false });
      toast.success(t('created'));
    },
    onError: () => toast.error(t('createError')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, globalEnabled }: { id: number; globalEnabled: boolean }) =>
      apiClient.put<FeatureFlag>(`/admin/feature-flags/${id}`, { globalEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success(t('updated'));
    },
    onError: () => toast.error(t('updateError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/admin/feature-flags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      if (expandedFlagId !== null) setExpandedFlagId(null);
      toast.success(t('deleted'));
    },
    onError: () => toast.error(t('deleteError')),
  });

  const overrideMutation = useMutation({
    mutationFn: ({
      flagId,
      companyId,
      enabled,
    }: {
      flagId: number;
      companyId: number;
      enabled: boolean;
    }) =>
      apiClient.post<FlagOverride>(`/admin/feature-flags/${flagId}/overrides`, {
        companyId,
        enabled,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'feature-flags', variables.flagId, 'overrides'],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      toast.success(t('overrideUpdated'));
    },
    onError: () => toast.error(t('overrideError')),
  });

  const handleToggleExpand = (id: number) => {
    setExpandedFlagId(expandedFlagId === id ? null : id);
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: createForm.name,
      description: createForm.description || undefined,
      globalEnabled: createForm.globalEnabled,
    });
  };

  return (
    <div className="space-y-4">
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <PageHeader title={t('title')} />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createFlag')}
          </Button>
        </div>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t('columns.name')}</TableHead>
              <TableHead>{t('columns.description')}</TableHead>
              <TableHead>{t('columns.globalStatus')}</TableHead>
              <TableHead className="text-right">{t('columns.overrides')}</TableHead>
              <TableHead>{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {tCommon('loading')}
                </TableCell>
              </TableRow>
            ) : !flags || flags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {tCommon('noResults')}
                </TableCell>
              </TableRow>
            ) : (
              flags.flatMap((flag) => [
                <TableRow key={flag.id} className="cursor-pointer hover:bg-muted/40">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleToggleExpand(flag.id)}
                      aria-label="Rozbalit detail"
                    >
                      {expandedFlagId === flag.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">{flag.name}</TableCell>
                  <TableCell className="text-muted-foreground">{flag.description ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flag.global_enabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: flag.id, globalEnabled: checked })
                        }
                        disabled={toggleMutation.isPending}
                      />
                      <Badge variant={flag.global_enabled ? 'default' : 'secondary'}>
                        {flag.global_enabled ? t('enabled') : t('disabled')}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{flag.override_count}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(flag.id)}
                      disabled={deleteMutation.isPending}
                      aria-label="Smazat priznak"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>,
                ...(expandedFlagId === flag.id
                  ? [
                      <TableRow key={`${flag.id}-overrides`}>
                        <TableCell colSpan={6} className="bg-muted/20 p-4">
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold">{t('overridesTitle')}</h3>
                            {!overrides || overrides.length === 0 ? (
                              <p className="text-sm text-muted-foreground">{t('noOverrides')}</p>
                            ) : (
                              <div className="space-y-2">
                                {overrides.map((override) => (
                                  <div
                                    key={override.id}
                                    className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
                                  >
                                    <span className="text-sm font-medium">
                                      {override.company_name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={override.enabled}
                                        onCheckedChange={(checked) =>
                                          overrideMutation.mutate({
                                            flagId: flag.id,
                                            companyId: override.company_id,
                                            enabled: checked,
                                          })
                                        }
                                        disabled={overrideMutation.isPending}
                                      />
                                      <Badge variant={override.enabled ? 'default' : 'secondary'}>
                                        {override.enabled ? t('enabled') : t('disabled')}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>,
                    ]
                  : []),
              ])
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createFlagTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-name">{t('fields.name')}</Label>
              <Input
                id="flag-name"
                placeholder="my-feature-flag"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag-description">{t('fields.description')}</Label>
              <Textarea
                id="flag-description"
                placeholder={t('fields.descriptionPlaceholder')}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="flag-global-enabled"
                checked={createForm.globalEnabled}
                onCheckedChange={(checked) =>
                  setCreateForm((f) => ({ ...f, globalEnabled: checked }))
                }
              />
              <Label htmlFor="flag-global-enabled">{t('fields.enableGlobally')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!createForm.name || createMutation.isPending}>
              {createMutation.isPending ? tCommon('saving') : t('createFlag')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
