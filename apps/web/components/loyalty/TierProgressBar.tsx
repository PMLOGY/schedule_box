'use client';

/**
 * Tier Progress Bar Component
 *
 * Displays visual progress toward the next loyalty tier with percentage,
 * points needed, and animated fill transition.
 *
 * @see LOYAL-01 tier system in schedulebox_complete_documentation.md
 */

import { cn } from '@/lib/utils';
import type { LoyaltyTier } from '@schedulebox/shared/types';

// ============================================================================
// PROPS
// ============================================================================

interface TierProgressBarProps {
  /** Current tier (null if no tier assigned) */
  currentTier: LoyaltyTier | null;
  /** Next tier info (null if already at max tier) */
  nextTier: {
    name: string;
    minPoints: number;
    pointsNeeded: number;
  } | null;
  /** Customer's current points balance */
  currentPoints: number;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate progress percentage toward next tier
 */
function calculateProgress(
  currentPoints: number,
  currentTierMinPoints: number,
  nextTierMinPoints: number,
): number {
  const range = nextTierMinPoints - currentTierMinPoints;
  if (range <= 0) return 100;
  const progress = ((currentPoints - currentTierMinPoints) / range) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Format number with Czech locale
 */
function formatPoints(points: number): string {
  return points.toLocaleString('cs-CZ');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TierProgressBar({
  currentTier,
  nextTier,
  currentPoints,
  className,
}: TierProgressBarProps) {
  // Max tier reached
  if (!nextTier) {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentTier?.color || '#3B82F6' }}
          />
          <span className="text-sm font-medium">{currentTier?.name || 'Tier'}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">Dosazena nejvyssi uroven!</p>
      </div>
    );
  }

  const currentMinPoints = currentTier?.minPoints ?? 0;
  const progress = calculateProgress(currentPoints, currentMinPoints, nextTier.minPoints);
  const tierColor = currentTier?.color || '#3B82F6';

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      {/* Tier label: Current -> Next */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tierColor }} />
          <span>{currentTier?.name || 'Start'}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-muted-foreground"
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
          <span>{nextTier.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: tierColor,
          }}
        />
      </div>

      {/* Points needed label */}
      <p className="text-xs text-muted-foreground mt-2">
        {formatPoints(nextTier.pointsNeeded)} bodu do {nextTier.name}
      </p>
    </div>
  );
}
