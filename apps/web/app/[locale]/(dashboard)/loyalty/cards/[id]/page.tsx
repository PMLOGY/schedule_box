'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { useLoyaltyCard, useTransactions, useAddPoints } from '@/hooks/use-loyalty-queries';
import { useLoyaltyStore } from '@/stores/loyalty.store';
import {
  CreditCard,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Smartphone,
  ArrowLeft,
} from 'lucide-react';
import { Link } from '@/lib/i18n/navigation';
import type { TransactionType } from '@schedulebox/shared/types';

// ============================================================================
// TRANSACTION TYPE BADGES
// ============================================================================

const transactionTypeConfig: Record<
  TransactionType,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  earn: { label: 'Získání', variant: 'default' },
  redeem: { label: 'Uplatnění', variant: 'destructive' },
  adjust: { label: 'Úprava', variant: 'outline' },
  expire: { label: 'Expirace', variant: 'secondary' },
  stamp: { label: 'Razítko', variant: 'default' },
};

// ============================================================================
// PROGRESS BAR
// ============================================================================

function TierProgressBar({
  currentPoints,
  currentTierName,
  nextTier,
}: {
  currentPoints: number;
  currentTierName: string | null;
  nextTier: {
    name: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
}) {
  if (!nextTier) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {currentTierName ?? 'Žádná úroveň'} - Dosažena maximální úroveň
          </span>
          <span className="font-medium">{currentPoints.toLocaleString()} b.</span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary">
          <div className="h-3 rounded-full bg-primary" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  const progress = Math.min(
    100,
    ((nextTier.minPoints - nextTier.pointsNeeded) / nextTier.minPoints) * 100,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {currentTierName ?? 'Žádná úroveň'} &rarr; {nextTier.name}
        </span>
        <span className="font-medium">{nextTier.pointsNeeded.toLocaleString()} bodů potřeba</span>
      </div>
      <div className="h-3 w-full rounded-full bg-secondary">
        <div
          className="h-3 rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {(nextTier.minPoints - nextTier.pointsNeeded).toLocaleString()} /{' '}
        {nextTier.minPoints.toLocaleString()} bodů do úrovně {nextTier.name}
      </p>
    </div>
  );
}

// ============================================================================
// ADD POINTS DIALOG
// ============================================================================

function AddPointsDialog({
  open,
  onOpenChange,
  cardId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
}) {
  const [points, setPoints] = useState(10);
  const [description, setDescription] = useState('');
  const addPoints = useAddPoints();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPoints.mutate(
      {
        cardId,
        data: {
          points,
          description: description || undefined,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPoints(10);
          setDescription('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přidat body</DialogTitle>
          <DialogDescription>Manuálně přidejte body na tuto věrnostní kartu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-points">Body</Label>
            <Input
              id="add-points"
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-description">
              Popis <span className="text-muted-foreground">(volitelné)</span>
            </Label>
            <Input
              id="add-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="např. Manuální bonus"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={addPoints.isPending || points < 1}>
              {addPoints.isPending ? 'Přidávání...' : 'Přidat body'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LoyaltyCardDetailPage() {
  const params = useParams();
  const cardId = params.id as string;

  const { data: card, isLoading: cardLoading, error: cardError } = useLoyaltyCard(cardId);

  const [txPage, setTxPage] = useState(1);
  const txLimit = 20;
  const { data: txData, isLoading: txLoading } = useTransactions(cardId, {
    page: txPage,
    limit: txLimit,
  });

  const { addPointsDialogOpen, openAddPointsDialog, closeAddPointsDialog } = useLoyaltyStore();

  const transactions = txData?.data ?? [];
  const txPagination = txData?.meta;

  if (cardLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cardError || !card) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/loyalty/cards">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na karty
          </Link>
        </Button>
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">Karta nenalezena</p>
            <p className="text-sm text-muted-foreground">
              Tato věrnostní karta neexistuje nebo byla odstraněna.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" asChild>
        <Link href="/loyalty/cards">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zpět na karty
        </Link>
      </Button>

      <PageHeader
        title={`Karta: ${card.cardNumber}`}
        description={`${card.customer.name}${card.customer.email ? ` - ${card.customer.email}` : ''}`}
        actions={
          <Button onClick={openAddPointsDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat body
          </Button>
        }
      />

      {/* Card Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stav bodů</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{card.pointsBalance.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktuální úroveň</CardDescription>
          </CardHeader>
          <CardContent>
            {card.currentTier ? (
              <Badge
                className="text-lg px-3 py-1"
                style={{
                  backgroundColor: card.currentTier.color,
                  color: '#fff',
                }}
              >
                {card.currentTier.name}
              </Badge>
            ) : (
              <p className="text-lg text-muted-foreground">Žádná úroveň</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Členem od</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {new Date(card.createdAt).toLocaleDateString('cs-CZ')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Postup v úrovních
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TierProgressBar
            currentPoints={card.pointsBalance}
            currentTierName={card.currentTier?.name ?? null}
            nextTier={card.nextTier}
          />
        </CardContent>
      </Card>

      {/* Wallet Passes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Digitální peněženka
          </CardTitle>
          <CardDescription>Přidejte tuto věrnostní kartu do digitální peněženky</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href={`/api/v1/loyalty/cards/${cardId}/apple-pass`} download>
                Přidat do Apple Wallet
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`/api/v1/loyalty/cards/${cardId}/google-pass`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Přidat do Google Wallet
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Historie transakcí</CardTitle>
          <CardDescription>Všechny bodové transakce pro tuto kartu</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center space-y-2">
              <p className="text-lg font-medium">Zatím žádné transakce</p>
              <p className="text-sm text-muted-foreground">
                Body se zde zobrazí, jakmile budou získány nebo uplatněny
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Body</TableHead>
                    <TableHead>Zůstatek po</TableHead>
                    <TableHead>Popis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const config = transactionTypeConfig[tx.type];
                    const isPositive =
                      tx.type === 'earn' ||
                      tx.type === 'stamp' ||
                      (tx.type === 'adjust' && tx.points > 0);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.createdAt).toLocaleString('cs-CZ')}</TableCell>
                        <TableCell>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </TableCell>
                        <TableCell
                          className={
                            isPositive ? 'font-medium text-green-600' : 'font-medium text-red-600'
                          }
                        >
                          {isPositive ? '+' : ''}
                          {tx.points.toLocaleString()}
                        </TableCell>
                        <TableCell>{tx.balanceAfter.toLocaleString()}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {tx.description ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {txPagination && txPagination.total_pages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    Stránka {txPagination.page} z {txPagination.total_pages} (celkem{' '}
                    {txPagination.total})
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      disabled={txPagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Předchozí
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTxPage((p) => p + 1)}
                      disabled={txPagination.page === txPagination.total_pages}
                    >
                      Další
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Points Dialog */}
      <AddPointsDialog
        open={addPointsDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAddPointsDialog();
        }}
        cardId={cardId}
      />
    </div>
  );
}
