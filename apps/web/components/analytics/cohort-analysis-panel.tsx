'use client';

/**
 * CohortAnalysisPanel
 *
 * Renders a cohort retention heatmap table for the super-admin dashboard.
 * Each row represents a signup month cohort, showing:
 * - Month label
 * - Number of signups
 * - Retention percentage (color-coded: green > 80%, yellow 50-80%, red < 50%)
 *
 * ADM-03: Company retention grouped by signup month.
 */

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export interface CohortData {
  month: string;
  signups: number;
  retention: number[];
}

export interface CohortAnalysisData {
  cohorts: CohortData[];
  months: string[];
}

interface CohortAnalysisPanelProps {
  data: CohortAnalysisData;
}

/**
 * Returns a Tailwind background class based on retention percentage.
 */
function retentionColor(pct: number): string {
  if (pct >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (pct >= 50) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
}

/**
 * Format YYYY-MM to a short localized month label (e.g., "Led 2026").
 */
function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('cs-CZ', { month: 'short', year: 'numeric' });
}

export function CohortAnalysisPanel({ data }: CohortAnalysisPanelProps) {
  const t = useTranslations('admin.cohort');

  if (!data.cohorts || data.cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('noData')}</p>
        </CardContent>
      </Card>
    );
  }

  // Determine the maximum retention array length for column headers
  const maxRetentionLen = Math.max(...data.cohorts.map((c) => c.retention.length));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium text-muted-foreground">{t('signupMonth')}</th>
                <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">
                  {t('signups')}
                </th>
                {Array.from({ length: maxRetentionLen }, (_, i) => (
                  <th
                    key={i}
                    className="pb-2 px-2 text-center font-medium text-muted-foreground min-w-[60px]"
                  >
                    {i === 0 ? t('retention') : `+${i}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((cohort) => (
                <tr key={cohort.month} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{formatMonthLabel(cohort.month)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{cohort.signups}</td>
                  {Array.from({ length: maxRetentionLen }, (_, i) => {
                    const pct = cohort.retention[i];
                    if (pct === undefined) {
                      return <td key={i} className="py-2 px-2" />;
                    }
                    return (
                      <td key={i} className="py-2 px-2 text-center">
                        <span
                          className={`inline-block min-w-[44px] rounded px-2 py-0.5 text-xs font-medium tabular-nums ${retentionColor(pct)}`}
                        >
                          {pct}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
