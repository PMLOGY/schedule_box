/**
 * NoShowRiskBadge Component
 *
 * Color-coded risk badge for booking list rows.
 * Displays risk level based on the stored noShowProbability from the Booking object.
 * Red >= 0.50 (high), Amber 0.30-0.49 (medium), Green < 0.30 (low), Gray null (unknown).
 */

'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NoShowRiskBadgeProps {
  probability: number | null;
}

type RiskLevel = 'high' | 'medium' | 'low' | 'unknown';

interface RiskStyle {
  bg: string;
  text: string;
}

const RISK_STYLES: Record<RiskLevel, RiskStyle> = {
  high: { bg: 'bg-red-100', text: 'text-red-800' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800' },
  low: { bg: 'bg-green-100', text: 'text-green-800' },
  unknown: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

function getRiskLevel(probability: number | null): RiskLevel {
  if (probability === null) return 'unknown';
  if (probability >= 0.5) return 'high';
  if (probability >= 0.3) return 'medium';
  return 'low';
}

export function NoShowRiskBadge({ probability }: NoShowRiskBadgeProps) {
  const t = useTranslations('ai.riskBadge');

  const riskLevel = getRiskLevel(probability);
  const styles = RISK_STYLES[riskLevel];

  const tooltipText =
    probability !== null
      ? `${t('tooltipPrefix')}: ${Math.round(probability * 100)}%`
      : t('unknown');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={`${styles.bg} ${styles.text} border-transparent cursor-default`}
            variant="outline"
          >
            {probability !== null ? `${Math.round(probability * 100)}%` : '-'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
          <p className="text-xs opacity-75">{t(riskLevel)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
