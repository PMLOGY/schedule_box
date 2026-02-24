/**
 * NoShowRiskDetail Component
 *
 * Risk detail section for the booking detail panel.
 * Shows probability as a percentage with an actionable human-readable label
 * based on the stored noShowProbability from the Booking object.
 */

'use client';

import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface NoShowRiskDetailProps {
  probability: number | null;
  confidence?: number;
  fallback?: boolean;
}

type RiskLevel = 'high' | 'medium' | 'low';

function getRiskLevel(probability: number): RiskLevel {
  if (probability >= 0.5) return 'high';
  if (probability >= 0.3) return 'medium';
  return 'low';
}

const RISK_DOT_COLORS: Record<RiskLevel, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

const RISK_ACTION_COLORS: Record<RiskLevel, string> = {
  high: 'text-red-700 font-semibold',
  medium: 'text-amber-700',
  low: 'text-green-700',
};

export function NoShowRiskDetail({ probability, confidence, fallback }: NoShowRiskDetailProps) {
  const t = useTranslations('ai.riskDetail');

  return (
    <>
      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="h-4 w-4" />
          {t('title')}
        </div>

        <div className="pl-6 space-y-1 text-sm">
          {probability === null ? (
            <p className="text-muted-foreground">{t('notScored')}</p>
          ) : (
            <>
              {/* Probability percentage */}
              <p className="text-muted-foreground">
                {t('probability')}:{' '}
                <span className="font-medium text-foreground">
                  {Math.round(probability * 100)}%
                </span>
              </p>

              {/* Risk level indicator */}
              {(() => {
                const riskLevel = getRiskLevel(probability);
                const dotColor = RISK_DOT_COLORS[riskLevel];
                const actionColor = RISK_ACTION_COLORS[riskLevel];
                const actionKey =
                  riskLevel === 'high'
                    ? 'highAction'
                    : riskLevel === 'medium'
                      ? 'mediumAction'
                      : 'lowAction';

                return (
                  <>
                    {/* Actionable label */}
                    <div className="flex items-start gap-2 mt-1">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`}
                        aria-hidden="true"
                      />
                      <p className={actionColor}>{t(actionKey)}</p>
                    </div>
                  </>
                );
              })()}

              {/* AI confidence */}
              {confidence !== undefined && (
                <p className="text-muted-foreground">
                  {t('confidence')}:{' '}
                  <span className="font-medium text-foreground">
                    {Math.round(confidence * 100)}%
                  </span>
                </p>
              )}

              {/* Fallback warning */}
              {fallback && (
                <p className="text-muted-foreground text-xs mt-1">{t('fallbackNote')}</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
