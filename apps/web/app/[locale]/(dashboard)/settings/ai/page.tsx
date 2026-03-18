'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// TYPES
// ============================================================================

interface AiSettings {
  industry_type: string;
  upselling_enabled: boolean;
  capacity_mode: 'individual' | 'group' | 'standard';
  defaults: {
    upselling_enabled: boolean;
    capacity_mode: string;
  };
}

// ============================================================================
// INDUSTRY LABEL MAP (Czech names for display)
// ============================================================================

const INDUSTRY_NAMES: Record<string, string> = {
  medical_clinic: 'Zdravotnické zařízení',
  auto_service: 'Autoservis',
  fitness_gym: 'Fitness centrum',
  yoga_pilates: 'Jóga / Pilates',
  beauty_salon: 'Kosmetický salón',
  general: 'Obecné podnikání',
};

const CAPACITY_MODE_LABELS: Record<string, string> = {
  individual: 'Individuální (1 klient / termín)',
  group: 'Skupinový (více klientů / termín)',
  standard: 'Standardní',
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function AiSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings', 'ai'],
    queryFn: () => apiClient.get<AiSettings>('/settings/ai'),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (update: Partial<Pick<AiSettings, 'upselling_enabled' | 'capacity_mode'>>) =>
      apiClient.put('/settings/ai', update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'ai'] });
      toast.success('Nastavení AI bylo uloženo');
    },
    onError: () => {
      toast.error('Nepodařilo se uložit nastavení AI');
    },
  });

  const industryName = INDUSTRY_NAMES[settings?.industry_type ?? 'general'] ?? 'Obecné podnikání';

  return (
    <div className="space-y-6">
      <PageHeader title="Nastavení AI" description="Konfigurace AI optimalizace pro vaše odvětví" />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upselling toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nabídka doplňkových služeb (Upselling)</CardTitle>
              <CardDescription>
                Zobrazovat AI doporučení pro doplňkové služby při rezervaci
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Aktivovat upselling</Label>
                  <p className="text-sm text-muted-foreground">
                    Nabízet doplňkové služby při rezervaci zákazníkem
                  </p>
                </div>
                <Switch
                  checked={settings?.upselling_enabled ?? true}
                  onCheckedChange={(checked) => mutation.mutate({ upselling_enabled: checked })}
                  disabled={mutation.isPending}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Výchozí pro {industryName}:{' '}
                <span className="font-medium">
                  {settings?.defaults?.upselling_enabled ? 'Zapnuto' : 'Vypnuto'}
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Capacity mode select */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Režim kapacity</CardTitle>
              <CardDescription>
                Jak AI plánuje dostupnost slotů — individuálně nebo skupinově
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Režim kapacity rezervací</Label>
                <Select
                  value={settings?.capacity_mode ?? 'standard'}
                  onValueChange={(value) =>
                    mutation.mutate({
                      capacity_mode: value as 'individual' | 'group' | 'standard',
                    })
                  }
                  disabled={mutation.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAPACITY_MODE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Výchozí pro {industryName}:{' '}
                <span className="font-medium">
                  {CAPACITY_MODE_LABELS[settings?.defaults?.capacity_mode ?? 'standard'] ??
                    'Standardní'}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
