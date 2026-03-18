/**
 * useIndustryLabels
 *
 * React hook that returns Czech UI labels for the current company's
 * industry vertical, derived from company settings.
 *
 * Logic lives in industry-labels.ts — this hook is a thin adapter
 * that bridges company context to the label resolver.
 */

import { useMemo } from 'react';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';
import { getIndustryLabels, type IndustryLabels } from '@/lib/industry/industry-labels';

export type { IndustryLabels };

/**
 * Returns resolved Czech UI labels for the current company's industry vertical.
 * Falls back to generic labels while settings are loading or for unknown types.
 */
export function useIndustryLabels(): IndustryLabels {
  const { data } = useCompanySettingsQuery();
  return useMemo(() => getIndustryLabels(data?.industry_type ?? 'general'), [data?.industry_type]);
}
