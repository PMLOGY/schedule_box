/**
 * useIndustryConfig
 *
 * React hook that returns UI configuration for the current company's
 * industry vertical, derived from company settings.
 *
 * Logic lives in industry-ui-config.ts -- this hook is a thin adapter
 * that bridges company context to the config resolver.
 */

import { useMemo } from 'react';
import { useCompanySettingsQuery } from '@/hooks/use-settings-query';
import { getIndustryUiConfig, type IndustryUiConfig } from '@/lib/industry/industry-ui-config';

export type { IndustryUiConfig };

/**
 * Returns resolved UI config for the current company's industry vertical.
 * Falls back to generic config while settings are loading or for unknown types.
 */
export function useIndustryConfig(): IndustryUiConfig {
  const { data } = useCompanySettingsQuery();
  return useMemo(
    () => getIndustryUiConfig(data?.industry_type ?? 'general'),
    [data?.industry_type],
  );
}
