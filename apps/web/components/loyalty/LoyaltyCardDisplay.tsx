'use client';

/**
 * Loyalty Card Display Component
 *
 * Renders a branded loyalty card showing points balance, tier info,
 * card number, and customer name. Styled like a physical loyalty card
 * with gradient background based on tier color.
 *
 * @see LOYAL-01 through LOYAL-07 in schedulebox_complete_documentation.md
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { LoyaltyCard } from '@schedulebox/shared/types';
import { WalletButtons } from './WalletButtons';

// ============================================================================
// PROPS
// ============================================================================

interface LoyaltyCardDisplayProps {
  card: LoyaltyCard;
  /** Whether to render Apple/Google wallet buttons below the card */
  showWalletButtons?: boolean;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format number with Czech locale thousands separator
 */
function formatPoints(points: number): string {
  return points.toLocaleString('cs-CZ');
}

/**
 * Generate stamp indicators for stamp-type programs
 * Shows filled and empty stamps in a row
 */
function StampsRow({ stamps, maxStamps }: { stamps: number; maxStamps: number }) {
  const filled = Math.min(stamps, maxStamps);
  const empty = Math.max(0, maxStamps - filled);

  return (
    <div className="flex items-center gap-1.5 justify-center mt-2">
      {Array.from({ length: filled }).map((_, i) => (
        <div
          key={`filled-${i}`}
          className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center text-xs"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-amber-500"
          >
            <path
              fillRule="evenodd"
              d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <div key={`empty-${i}`} className="w-6 h-6 rounded-full border-2 border-white/50" />
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LoyaltyCardDisplay({
  card,
  showWalletButtons = false,
  className,
}: LoyaltyCardDisplayProps) {
  const tierColor = card.currentTier?.color || '#3B82F6';

  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      {/* Card */}
      <div
        className="relative rounded-2xl shadow-lg overflow-hidden p-6 text-white min-h-[220px] flex flex-col justify-between"
        style={{
          background: `linear-gradient(135deg, ${tierColor} 0%, ${tierColor}CC 50%, ${tierColor}99 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-6 -translate-x-6" />

        {/* Top section: program name + tier badge */}
        <div className="relative z-10 flex items-start justify-between">
          <span className="text-sm font-medium text-white/90 tracking-wide uppercase">
            Loyalty Card
          </span>
          {card.currentTier && (
            <Badge
              className="bg-white/20 border-white/30 text-white text-xs font-semibold"
              variant="outline"
            >
              {card.currentTier.name}
            </Badge>
          )}
        </div>

        {/* Center section: points balance */}
        <div className="relative z-10 text-center my-4">
          <div className="text-4xl font-bold tracking-tight">
            {formatPoints(card.pointsBalance)}
          </div>
          <div className="text-sm text-white/80 mt-1">bodu</div>

          {/* Stamps row for stamp programs */}
          {card.stampsBalance > 0 && <StampsRow stamps={card.stampsBalance} maxStamps={10} />}
        </div>

        {/* Bottom section: card number + customer name */}
        <div className="relative z-10 flex items-end justify-between">
          <span className="font-mono text-xs text-white/70 tracking-wider">{card.cardNumber}</span>
          <span className="text-sm text-white/90 font-medium">{card.customer.name}</span>
        </div>
      </div>

      {/* Wallet buttons below card */}
      {showWalletButtons && (
        <div className="mt-4">
          <WalletButtons
            cardUuid={card.uuid}
            applePassUrl={card.applePassUrl}
            googlePassUrl={card.googlePassUrl}
          />
        </div>
      )}
    </div>
  );
}
