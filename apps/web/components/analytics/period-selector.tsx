'use client';

/**
 * Period Selector Component
 * Dropdown for selecting analytics time period (7, 30, 90 days)
 */

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PeriodSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const t = useTranslations('analytics.period');

  const periods = [
    { value: 7, label: t('last7days') },
    { value: 30, label: t('last30days') },
    { value: 90, label: t('last90days') },
  ];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="period-selector" className="text-sm font-medium">
        {t('label')}:
      </label>
      <Select value={value.toString()} onValueChange={(val) => onChange(Number(val))}>
        <SelectTrigger id="period-selector" className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periods.map((period) => (
            <SelectItem key={period.value} value={period.value.toString()}>
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
