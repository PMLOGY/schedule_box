'use client';

/**
 * Rewards Catalog Component
 *
 * Displays a grid of available loyalty rewards with redemption buttons.
 * Each reward shows name, description, points cost, type badge, and availability.
 * Redeem button is disabled when insufficient points.
 *
 * @see LOYAL-04 rewards catalog in schedulebox_complete_documentation.md
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRedeemReward } from '@/hooks/use-loyalty-queries';
import type { Reward, RewardType } from '@schedulebox/shared/types';

// ============================================================================
// PROPS
// ============================================================================

interface RewardsCatalogProps {
  /** Available rewards to display */
  rewards: Reward[];
  /** Customer's current points balance for enabling/disabling redeem */
  cardPointsBalance: number;
  /** UUID of the customer's loyalty card */
  cardUuid: string;
  /** Optional callback after successful redemption */
  onRedeem?: (rewardId: number) => void;
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Czech labels for reward types
 */
const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  discount_percentage: 'Sleva %',
  discount_fixed: 'Sleva Kc',
  free_service: 'Sluzba zdarma',
  gift: 'Darek',
};

/**
 * Badge color variants for reward types
 */
const REWARD_TYPE_COLORS: Record<RewardType, string> = {
  discount_percentage: 'bg-blue-100 text-blue-800',
  discount_fixed: 'bg-green-100 text-green-800',
  free_service: 'bg-purple-100 text-purple-800',
  gift: 'bg-amber-100 text-amber-800',
};

// ============================================================================
// HELPERS
// ============================================================================

function formatPoints(points: number): string {
  return points.toLocaleString('cs-CZ');
}

function isRewardAvailable(reward: Reward): boolean {
  if (!reward.isActive) return false;
  if (reward.maxRedemptions !== null && reward.currentRedemptions >= reward.maxRedemptions) {
    return false;
  }
  return true;
}

// ============================================================================
// REWARD CARD SUB-COMPONENT
// ============================================================================

function RewardCard({
  reward,
  cardPointsBalance,
  cardUuid,
  onRedeem,
}: {
  reward: Reward;
  cardPointsBalance: number;
  cardUuid: string;
  onRedeem?: (rewardId: number) => void;
}) {
  const redeemMutation = useRedeemReward();
  const [isRedeeming, setIsRedeeming] = useState(false);

  const canAfford = cardPointsBalance >= reward.pointsCost;
  const available = isRewardAvailable(reward);
  const canRedeem = canAfford && available;

  const handleRedeem = useCallback(async () => {
    if (!canRedeem) return;
    setIsRedeeming(true);

    try {
      await redeemMutation.mutateAsync({
        rewardId: reward.id,
        cardId: cardUuid,
      });
      onRedeem?.(reward.id);
    } catch {
      // Error is handled by TanStack Query
    } finally {
      setIsRedeeming(false);
    }
  }, [canRedeem, redeemMutation, reward.id, cardUuid, onRedeem]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight">{reward.name}</CardTitle>
          <Badge
            className={cn(
              'shrink-0 border-transparent text-xs',
              REWARD_TYPE_COLORS[reward.rewardType],
            )}
            variant="outline"
          >
            {REWARD_TYPE_LABELS[reward.rewardType]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {/* Description */}
        {reward.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{reward.description}</p>
        )}

        {/* Points cost */}
        <div className="text-2xl font-bold text-primary">
          {formatPoints(reward.pointsCost)} <span className="text-sm font-normal">bodu</span>
        </div>

        {/* Availability indicator */}
        {reward.maxRedemptions !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            {reward.currentRedemptions}/{reward.maxRedemptions} vymeneno
          </p>
        )}
      </CardContent>

      <CardFooter>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  onClick={handleRedeem}
                  disabled={!canRedeem || isRedeeming}
                  isLoading={isRedeeming}
                  className="w-full"
                  size="sm"
                >
                  {isRedeeming ? 'Vymena...' : 'Vymenit'}
                </Button>
              </div>
            </TooltipTrigger>
            {!canRedeem && (
              <TooltipContent>
                {!available
                  ? 'Odmena neni k dispozici'
                  : `Nedostatek bodu (potrebujete ${formatPoints(reward.pointsCost)})`}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RewardsCatalog({
  rewards,
  cardPointsBalance,
  cardUuid,
  onRedeem,
  className,
}: RewardsCatalogProps) {
  // Empty state
  if (rewards.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-muted-foreground">Zatim nejsou k dispozici zadne odmeny</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {rewards.map((reward) => (
        <RewardCard
          key={reward.id}
          reward={reward}
          cardPointsBalance={cardPointsBalance}
          cardUuid={cardUuid}
          onRedeem={onRedeem}
        />
      ))}
    </div>
  );
}
