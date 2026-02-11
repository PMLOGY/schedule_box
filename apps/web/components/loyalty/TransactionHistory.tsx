'use client';

/**
 * Transaction History Component
 *
 * Displays a paginated timeline of loyalty points transactions.
 * Shows earn, redeem, adjust, expire, and stamp events with
 * color-coded badges and running balance.
 *
 * @see LOYAL-05 transaction tracking in schedulebox_complete_documentation.md
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions } from '@/hooks/use-loyalty-queries';
import type { TransactionType, LoyaltyTransaction } from '@schedulebox/shared/types';

// ============================================================================
// PROPS
// ============================================================================

interface TransactionHistoryProps {
  /** UUID of the loyalty card to fetch transactions for */
  cardUuid: string;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Czech labels and colors for transaction types
 */
const TRANSACTION_TYPE_CONFIG: Record<
  TransactionType,
  { label: string; bgColor: string; textColor: string }
> = {
  earn: { label: 'Zisk', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  redeem: { label: 'Vymena', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  adjust: { label: 'Uprava', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  expire: { label: 'Expirace', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  stamp: { label: 'Razitko', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format date for Czech locale: "11. 2. 2026 14:30"
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}. ${month}. ${year} ${hours}:${minutes}`;
}

/**
 * Format points change with sign and color
 */
function formatPointsChange(points: number): { text: string; colorClass: string } {
  if (points > 0) {
    return {
      text: `+${points.toLocaleString('cs-CZ')}`,
      colorClass: 'text-green-600',
    };
  }
  return {
    text: points.toLocaleString('cs-CZ'),
    colorClass: 'text-red-600',
  };
}

/**
 * Format balance with Czech locale
 */
function formatBalance(balance: number): string {
  return balance.toLocaleString('cs-CZ');
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="h-8 w-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-3 w-24 ml-auto" />
      </div>
    </div>
  );
}

// ============================================================================
// TRANSACTION ROW
// ============================================================================

function TransactionRow({ transaction }: { transaction: LoyaltyTransaction }) {
  const config = TRANSACTION_TYPE_CONFIG[transaction.type];
  const pointsChange = formatPointsChange(transaction.points);

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-b-0">
      {/* Type badge */}
      <Badge
        className={cn(
          'shrink-0 border-transparent text-xs min-w-[72px] justify-center',
          config.bgColor,
          config.textColor,
        )}
        variant="outline"
      >
        {config.label}
      </Badge>

      {/* Description + date */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{transaction.description || config.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDateTime(transaction.createdAt)}
        </p>
      </div>

      {/* Points change + balance */}
      <div className="text-right shrink-0">
        <p className={cn('text-sm font-semibold', pointsChange.colorClass)}>{pointsChange.text}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Zustatek: {formatBalance(transaction.balanceAfter)}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TransactionHistory({ cardUuid, className }: TransactionHistoryProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useTransactions(cardUuid, {
    page,
    limit: 10,
  });

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const hasMore = data ? data.meta.page < data.meta.total_pages : false;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-0', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <TransactionSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!data || data.data.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-muted-foreground">Zatim zadne transakce</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Transaction list */}
      <div className="divide-y divide-border">
        {data.data.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            size="sm"
            isLoading={isFetching}
            disabled={isFetching}
          >
            {isFetching ? 'Nacitani...' : 'Nacist dalsi'}
          </Button>
        </div>
      )}
    </div>
  );
}
