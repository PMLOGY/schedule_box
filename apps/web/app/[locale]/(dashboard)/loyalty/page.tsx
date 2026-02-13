'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import {
  useLoyaltyProgram,
  useCreateProgram,
  useUpdateProgram,
  useCreateTier,
  useTiers,
  useDeleteTier,
} from '@/hooks/use-loyalty-queries';
import { useLoyaltyStore } from '@/stores/loyalty.store';
import { Settings, Plus, Star, Pencil, CreditCard, Gift, Trash2 } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import type { LoyaltyProgramType } from '@schedulebox/shared/types';

// ============================================================================
// PROGRAM FORM
// ============================================================================

function ProgramForm({
  initialValues,
  onSubmit,
  isSubmitting,
  t,
}: {
  initialValues?: {
    name: string;
    description: string;
    type: LoyaltyProgramType;
    points_per_currency: number;
  };
  onSubmit: (data: {
    name: string;
    description?: string;
    type: LoyaltyProgramType;
    points_per_currency: number;
  }) => void;
  isSubmitting: boolean;
  t: ReturnType<typeof useTranslations<'loyalty'>>;
}) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [type, setType] = useState<LoyaltyProgramType>(initialValues?.type ?? 'points');
  const [pointsPerCurrency, setPointsPerCurrency] = useState(
    initialValues?.points_per_currency ?? 1,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      type,
      points_per_currency: pointsPerCurrency,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="program-name">{t('form.name')}</Label>
        <Input
          id="program-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="program-description">{t('form.description')}</Label>
        <Input
          id="program-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('form.descriptionPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="program-type">{t('form.type')}</Label>
        <Select value={type} onValueChange={(v) => setType(v as LoyaltyProgramType)}>
          <SelectTrigger id="program-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="points">{t('form.typePoints')}</SelectItem>
            <SelectItem value="stamps">{t('form.typeStamps')}</SelectItem>
            <SelectItem value="tiers">{t('form.typeTiers')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="program-ppc">{t('form.pointsPerCurrency')}</Label>
        <Input
          id="program-ppc"
          type="number"
          min={1}
          max={99999}
          value={pointsPerCurrency}
          onChange={(e) => setPointsPerCurrency(Number(e.target.value))}
          required
        />
        <p className="text-xs text-muted-foreground">{t('form.pointsPerCurrencyHint')}</p>
      </div>

      <Button type="submit" disabled={isSubmitting || !name}>
        {isSubmitting ? t('form.saving') : initialValues ? t('form.update') : t('form.create')}
      </Button>
    </form>
  );
}

// ============================================================================
// TIER FORM DIALOG
// ============================================================================

function TierFormDialog({
  open,
  onOpenChange,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: ReturnType<typeof useTranslations<'loyalty'>>;
}) {
  const [name, setName] = useState('');
  const [minPoints, setMinPoints] = useState(0);
  const [color, setColor] = useState('#3B82F6');
  const [sortOrder, setSortOrder] = useState(0);
  const createTier = useCreateTier();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTier.mutate(
      {
        name,
        min_points: minPoints,
        color,
        sort_order: sortOrder,
        benefits: {},
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName('');
          setMinPoints(0);
          setColor('#3B82F6');
          setSortOrder(0);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tiers.dialog.title')}</DialogTitle>
          <DialogDescription>{t('tiers.dialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tier-name">{t('tiers.dialog.name')}</Label>
            <Input
              id="tier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tiers.dialog.namePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier-min-points">{t('tiers.dialog.minPoints')}</Label>
            <Input
              id="tier-min-points"
              type="number"
              min={0}
              value={minPoints}
              onChange={(e) => setMinPoints(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier-color">{t('tiers.dialog.color')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="tier-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier-sort">{t('tiers.dialog.sortOrder')}</Label>
            <Input
              id="tier-sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('tiers.dialog.cancel')}
            </Button>
            <Button type="submit" disabled={createTier.isPending || !name}>
              {createTier.isPending ? t('tiers.dialog.creating') : t('tiers.dialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SUGGESTED TIERS
// ============================================================================

function SuggestedTiers({ t }: { t: ReturnType<typeof useTranslations<'loyalty'>> }) {
  const createTier = useCreateTier();
  const [applied, setApplied] = useState(false);

  const suggestedTiers = [
    { name: t('suggestedTiers.bronze'), min_points: 0, color: '#CD7F32', sort_order: 0 },
    { name: t('suggestedTiers.silver'), min_points: 500, color: '#C0C0C0', sort_order: 1 },
    { name: t('suggestedTiers.gold'), min_points: 1500, color: '#FFD700', sort_order: 2 },
  ];

  const applyDefaults = async () => {
    setApplied(true);
    for (const tier of suggestedTiers) {
      await createTier.mutateAsync({ ...tier, benefits: {} });
    }
  };

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="mb-2 text-sm text-muted-foreground">{t('tiers.noTiers')}</p>
      <div className="mb-3 flex gap-2">
        {suggestedTiers.map((tier) => (
          <Badge
            key={tier.name}
            variant="outline"
            style={{ borderColor: tier.color, color: tier.color }}
          >
            {tier.name} ({tier.min_points} {t('tiers.pointsSuffix')})
          </Badge>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={applyDefaults}
        disabled={applied || createTier.isPending}
      >
        {applied ? t('tiers.applied') : t('tiers.applyDefaults')}
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LoyaltyProgramPage() {
  const t = useTranslations('loyalty');
  const { data: program, isLoading, error } = useLoyaltyProgram();
  const { data: tiers } = useTiers();
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteTier = useDeleteTier();
  const { programFormOpen, openProgramForm, closeProgramForm } = useLoyaltyStore();
  const [tierDialogOpen, setTierDialogOpen] = useState(false);

  const hasProgram =
    !!program &&
    !(
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      (error as { statusCode: number }).statusCode === 404
    );

  const handleCreate = (data: {
    name: string;
    description?: string;
    type: LoyaltyProgramType;
    points_per_currency: number;
  }) => {
    createProgram.mutate(data, {
      onSuccess: () => closeProgramForm(),
    });
  };

  const handleUpdate = (data: {
    name: string;
    description?: string;
    type: LoyaltyProgramType;
    points_per_currency: number;
  }) => {
    updateProgram.mutate(data, {
      onSuccess: () => closeProgramForm(),
    });
  };

  const handleDeleteTier = (tierId: number) => {
    if (!confirm(t('tiers.deleteConfirm'))) return;
    deleteTier.mutate(tierId);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title={t('title')} />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const programTiers = tiers ?? program?.tiers ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          hasProgram && !programFormOpen ? (
            <Button variant="outline" onClick={openProgramForm}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('editSettings')}
            </Button>
          ) : undefined
        }
      />

      {/* Program Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('programSettings')}
          </CardTitle>
          <CardDescription>
            {hasProgram
              ? t('programSettingsDescriptionExisting')
              : t('programSettingsDescriptionNew')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasProgram ? (
            <ProgramForm onSubmit={handleCreate} isSubmitting={createProgram.isPending} t={t} />
          ) : programFormOpen ? (
            <div className="space-y-4">
              <ProgramForm
                initialValues={{
                  name: program.name,
                  description: program.description ?? '',
                  type: program.type,
                  points_per_currency: program.pointsPerCurrency,
                }}
                onSubmit={handleUpdate}
                isSubmitting={updateProgram.isPending}
                t={t}
              />
              <Button variant="ghost" onClick={closeProgramForm}>
                {t('form.cancel')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('info.name')}</p>
                <p className="font-medium">{program.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('info.type')}</p>
                <Badge variant="outline" className="capitalize">
                  {program.type === 'points'
                    ? t('form.typePoints')
                    : program.type === 'stamps'
                      ? t('form.typeStamps')
                      : t('form.typeTiers')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('info.pointsPerCurrency')}</p>
                <p className="font-medium">{program.pointsPerCurrency}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('info.status')}</p>
                <Badge variant={program.isActive ? 'default' : 'secondary'}>
                  {program.isActive ? t('info.active') : t('info.inactive')}
                </Badge>
              </div>
              {program.description && (
                <div className="col-span-full">
                  <p className="text-sm text-muted-foreground">{t('info.descriptionLabel')}</p>
                  <p className="text-sm">{program.description}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Management */}
      {hasProgram && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  {t('tiers.title')}
                </CardTitle>
                <CardDescription>{t('tiers.description')}</CardDescription>
              </div>
              <Button onClick={() => setTierDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('tiers.add')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {programTiers.length === 0 ? (
              <SuggestedTiers t={t} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('tiers.columns.order')}</TableHead>
                    <TableHead>{t('tiers.columns.name')}</TableHead>
                    <TableHead>{t('tiers.columns.minPoints')}</TableHead>
                    <TableHead>{t('tiers.columns.color')}</TableHead>
                    <TableHead className="text-right">{t('tiers.columns.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...programTiers]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell>{tier.sortOrder}</TableCell>
                        <TableCell className="font-medium">{tier.name}</TableCell>
                        <TableCell>{tier.minPoints.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full border"
                              style={{ backgroundColor: tier.color }}
                            />
                            <span className="text-sm text-muted-foreground">{tier.color}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTier(tier.id)}
                            disabled={deleteTier.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <TierFormDialog open={tierDialogOpen} onOpenChange={setTierDialogOpen} t={t} />

      {/* Quick Links to sub-pages */}
      {hasProgram && (
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/loyalty/cards">
            <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5" />
                  {t('links.cardsTitle')}
                </CardTitle>
                <CardDescription>{t('links.cardsDescription')}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/loyalty/rewards">
            <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gift className="h-5 w-5" />
                  {t('links.rewardsTitle')}
                </CardTitle>
                <CardDescription>{t('links.rewardsDescription')}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
