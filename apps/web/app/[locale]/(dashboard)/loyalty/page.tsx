'use client';

import { useState } from 'react';
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
} from '@/hooks/use-loyalty-queries';
import { useLoyaltyStore } from '@/stores/loyalty.store';
import { Settings, Plus, Star, Pencil, CreditCard, Gift } from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import type { LoyaltyProgramType } from '@schedulebox/shared/types';

// ============================================================================
// PROGRAM FORM
// ============================================================================

function ProgramForm({
  initialValues,
  onSubmit,
  isSubmitting,
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
        <Label htmlFor="program-name">Název</Label>
        <Input
          id="program-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Můj věrnostní program"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="program-description">Popis</Label>
        <Input
          id="program-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Získejte body s každou rezervací"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="program-type">Typ programu</Label>
        <Select value={type} onValueChange={(v) => setType(v as LoyaltyProgramType)}>
          <SelectTrigger id="program-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="points">Body</SelectItem>
            <SelectItem value="stamps">Razítka</SelectItem>
            <SelectItem value="tiers">Úrovně</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="program-ppc">Body za korunu</Label>
        <Input
          id="program-ppc"
          type="number"
          min={1}
          max={99999}
          value={pointsPerCurrency}
          onChange={(e) => setPointsPerCurrency(Number(e.target.value))}
          required
        />
        <p className="text-xs text-muted-foreground">Kolik bodů zákazník získá za 1 Kč</p>
      </div>

      <Button type="submit" disabled={isSubmitting || !name}>
        {isSubmitting ? 'Ukládání...' : initialValues ? 'Aktualizovat program' : 'Vytvořit program'}
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          <DialogTitle>Přidat úroveň</DialogTitle>
          <DialogDescription>Vytvořte novou věrnostní úroveň pro váš program.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tier-name">Název</Label>
            <Input
              id="tier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Stříbrná"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier-min-points">Minimální počet bodů</Label>
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
            <Label htmlFor="tier-color">Barva</Label>
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
            <Label htmlFor="tier-sort">Pořadí</Label>
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
              Zrušit
            </Button>
            <Button type="submit" disabled={createTier.isPending || !name}>
              {createTier.isPending ? 'Vytváření...' : 'Vytvořit úroveň'}
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

function SuggestedTiers() {
  const createTier = useCreateTier();
  const [applied, setApplied] = useState(false);

  const suggestedTiers = [
    { name: 'Bronzová', min_points: 0, color: '#CD7F32', sort_order: 0 },
    { name: 'Stříbrná', min_points: 500, color: '#C0C0C0', sort_order: 1 },
    { name: 'Zlatá', min_points: 1500, color: '#FFD700', sort_order: 2 },
  ];

  const applyDefaults = async () => {
    setApplied(true);
    for (const tier of suggestedTiers) {
      await createTier.mutateAsync({ ...tier, benefits: {} });
    }
  };

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="mb-2 text-sm text-muted-foreground">
        Žádné úrovně nejsou nakonfigurovány. Použít navrhované výchozí hodnoty?
      </p>
      <div className="mb-3 flex gap-2">
        {suggestedTiers.map((t) => (
          <Badge key={t.name} variant="outline" style={{ borderColor: t.color, color: t.color }}>
            {t.name} ({t.min_points} b.)
          </Badge>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={applyDefaults}
        disabled={applied || createTier.isPending}
      >
        {applied ? 'Použito' : 'Použít výchozí úrovně'}
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LoyaltyProgramPage() {
  const { data: program, isLoading, error } = useLoyaltyProgram();
  const { data: tiers } = useTiers();
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Věrnostní program" />
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
        title="Věrnostní program"
        description="Nastavení věrnostního programu a úrovní"
        actions={
          hasProgram && !programFormOpen ? (
            <Button variant="outline" onClick={openProgramForm}>
              <Pencil className="mr-2 h-4 w-4" />
              Upravit nastavení
            </Button>
          ) : undefined
        }
      />

      {/* Program Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Nastavení programu
          </CardTitle>
          <CardDescription>
            {hasProgram
              ? 'Zobrazení a úprava konfigurace věrnostního programu'
              : 'Vytvořte nový věrnostní program pro vaše podnikání'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasProgram ? (
            <ProgramForm onSubmit={handleCreate} isSubmitting={createProgram.isPending} />
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
              />
              <Button variant="ghost" onClick={closeProgramForm}>
                Zrušit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Název</p>
                <p className="font-medium">{program.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Typ</p>
                <Badge variant="outline" className="capitalize">
                  {program.type === 'points'
                    ? 'Body'
                    : program.type === 'stamps'
                      ? 'Razítka'
                      : 'Úrovně'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bodů za Kč</p>
                <p className="font-medium">{program.pointsPerCurrency}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stav</p>
                <Badge variant={program.isActive ? 'default' : 'secondary'}>
                  {program.isActive ? 'Aktivní' : 'Neaktivní'}
                </Badge>
              </div>
              {program.description && (
                <div className="col-span-full">
                  <p className="text-sm text-muted-foreground">Popis</p>
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
                  Úrovně
                </CardTitle>
                <CardDescription>Správa věrnostních úrovní a jejich bodových prahů</CardDescription>
              </div>
              <Button onClick={() => setTierDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Přidat úroveň
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {programTiers.length === 0 ? (
              <SuggestedTiers />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pořadí</TableHead>
                    <TableHead>Název</TableHead>
                    <TableHead>Min. bodů</TableHead>
                    <TableHead>Barva</TableHead>
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
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <TierFormDialog open={tierDialogOpen} onOpenChange={setTierDialogOpen} />

      {/* Quick Links to sub-pages */}
      {hasProgram && (
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/loyalty/cards">
            <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5" />
                  Věrnostní karty
                </CardTitle>
                <CardDescription>Správa karet zákazníků, bodů a razítek</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/loyalty/rewards">
            <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gift className="h-5 w-5" />
                  Katalog odměn
                </CardTitle>
                <CardDescription>
                  Správa odměn, které mohou zákazníci získat za body
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
