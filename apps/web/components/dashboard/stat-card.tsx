'use client';

import { type LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: LucideIcon;
  formatter?: 'currency' | 'number' | 'percentage' | 'rating';
}

function formatValue(value: string | number, formatter?: StatCardProps['formatter']): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  switch (formatter) {
    case 'currency':
      return `${numValue.toLocaleString('cs-CZ')} Kč`;
    case 'percentage':
      return `${numValue}%`;
    case 'rating':
      return `${numValue.toFixed(1)} / 5`;
    case 'number':
    default:
      return `${numValue}`;
  }
}

export function StatCard({ title, value, trend, icon: Icon, formatter }: StatCardProps) {
  const t = useTranslations('dashboard');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value, formatter)}</div>
        {trend !== undefined && (
          <p
            className={`flex items-center text-xs ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
          >
            {trend >= 0 ? (
              <ArrowUp className="mr-1 h-3 w-3" />
            ) : (
              <ArrowDown className="mr-1 h-3 w-3" />
            )}
            {trend >= 0 ? '+' : ''}
            {trend}
            {formatter === 'rating' ? '' : '%'}{' '}
            <span className="ml-1 text-muted-foreground">{t('vsLastMonth')}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
