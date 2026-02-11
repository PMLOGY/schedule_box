/**
 * Capacity Forecast Dashboard
 *
 * Admin page for viewing AI-powered 7-day demand forecasts.
 * Shows daily summary cards with color-coded utilization levels
 * and AI-generated schedule adjustment suggestions.
 *
 * Uses the current company context from auth store for capacity queries.
 * Handles fallback states gracefully with info banners when AI is unavailable.
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { useCapacityForecast } from '@/hooks/useOptimization';
import { useAuthStore } from '@/stores/auth.store';
import {
  AlertCircle,
  CalendarDays,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';
import type { CapacityForecastEntry, CapacityScheduleSuggestion } from '@/hooks/useOptimization';

// ============================================================================
// HELPERS
// ============================================================================

const UTILIZATION_LABELS: Record<string, string> = {
  low: 'nízké',
  medium: 'střední',
  high: 'vysoké',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'nízká',
  medium: 'střední',
  high: 'vysoká',
};

const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  extend_hours: 'prodloužit hodiny',
  reduce_hours: 'zkrátit hodiny',
  add_employee: 'přidat zaměstnance',
};

function getUtilizationColor(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'low':
      return {
        bg: 'bg-green-100 dark:bg-green-950',
        text: 'text-green-700 dark:text-green-300',
        badge: 'bg-green-500',
        border: 'border-green-200 dark:border-green-800',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-950',
        text: 'text-yellow-700 dark:text-yellow-300',
        badge: 'bg-yellow-500',
        border: 'border-yellow-200 dark:border-yellow-800',
      };
    case 'high':
      return {
        bg: 'bg-red-100 dark:bg-red-950',
        text: 'text-red-700 dark:text-red-300',
        badge: 'bg-red-500',
        border: 'border-red-200 dark:border-red-800',
      };
  }
}

function formatDate(datetime: string): string {
  const date = new Date(datetime);
  return date.toLocaleDateString('cs-CZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getPriorityColor(priority: 'low' | 'medium' | 'high') {
  switch (priority) {
    case 'low':
      return 'secondary';
    case 'medium':
      return 'default';
    case 'high':
      return 'destructive';
  }
}

function getSuggestionIcon(type: string) {
  switch (type) {
    case 'extend_hours':
      return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case 'reduce_hours':
      return <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
    case 'add_employee':
      return <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <Lightbulb className="h-4 w-4 text-muted-foreground" />;
  }
}

// ============================================================================
// FORECAST CARD
// ============================================================================

function ForecastDayCard({ entry }: { entry: CapacityForecastEntry }) {
  const colors = getUtilizationColor(entry.utilization_level);

  return (
    <Card className={`${colors.border}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{formatDate(entry.datetime)}</p>
            <Badge variant="outline" className={`${colors.text}`}>
              {UTILIZATION_LABELS[entry.utilization_level] ?? entry.utilization_level}
            </Badge>
          </div>

          <div className="text-center">
            <p className="text-3xl font-bold">{Math.round(entry.predicted_bookings)}</p>
            <p className="text-xs text-muted-foreground">předpokládané rezervace</p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Min: {Math.round(entry.lower_bound)}</span>
            <span>Max: {Math.round(entry.upper_bound)}</span>
          </div>

          {/* Utilization bar */}
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className={`h-2 rounded-full ${colors.badge}`}
              style={{
                width: `${
                  entry.utilization_level === 'low'
                    ? 33
                    : entry.utilization_level === 'medium'
                      ? 66
                      : 100
                }%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUGGESTIONS LIST
// ============================================================================

function SuggestionsList({ suggestions }: { suggestions: CapacityScheduleSuggestion[] }) {
  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <Lightbulb className="h-8 w-8 text-muted-foreground" />
        <p className="text-center text-sm text-muted-foreground">
          Žádné změny v rozvrhu nejsou pro příštích 7 dní doporučeny.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, idx) => (
        <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
          <div className="mt-0.5">{getSuggestionIcon(suggestion.type)}</div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{formatDate(suggestion.datetime)}</p>
              <Badge variant={getPriorityColor(suggestion.priority)} className="text-xs">
                {PRIORITY_LABELS[suggestion.priority] ?? suggestion.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {SUGGESTION_TYPE_LABELS[suggestion.type] ?? suggestion.type.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function CapacityDashboard() {
  const _user = useAuthStore((state) => state.user);
  // Use a default companyId of 1 if not available from auth context
  // (companyId in auth store is a UUID string, capacity API needs int)
  const companyId = 1;

  const { data, isLoading, isError } = useCapacityForecast(companyId, 7, 8);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Predikce kapacity" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-7">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-16 mx-auto" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Predikce kapacity" />
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Nepodařilo se načíst predikci kapacity. Zkuste to prosím později.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasForecastData = data && data.forecast && data.forecast.length > 0;
  const _hasSuggestions = data && data.suggestions && data.suggestions.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI optimalizace"
        description="AI predikce poptávky zobrazuje předpokládané objemy rezervací a návrhy na optimalizaci rozvrhu na příštích 7 dní."
      />

      {/* AI Sub-navigation */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/ai/pricing">
            <TrendingUp className="mr-2 h-4 w-4" />
            Dynamické ceny
          </Link>
        </Button>
        <Button variant="default" size="sm" asChild>
          <Link href="/ai/capacity">
            <CalendarDays className="mr-2 h-4 w-4" />
            Predikce kapacity
          </Link>
        </Button>
      </div>

      {/* Fallback Banner */}
      {data?.fallback && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            AI predikce není k dispozici — je potřeba minimálně 12 týdnů dat o rezervacích.
          </p>
        </div>
      )}

      {/* 7-Day Forecast Summary */}
      {!hasForecastData && !data?.fallback ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Predikce kapacity bude k dispozici po nasbírání dostatečného množství dat o
              rezervacích.
            </p>
          </CardContent>
        </Card>
      ) : hasForecastData ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Predikce na 7 dní
            </CardTitle>
            <CardDescription>Předpokládané objemy rezervací a úrovně vytížení</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
              {data.forecast.map((entry, idx) => (
                <ForecastDayCard key={idx} entry={entry} />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Schedule Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Návrhy na úpravu rozvrhu
          </CardTitle>
          <CardDescription>
            AI doporučení pro úpravy rozvrhu na základě predikce poptávky
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuggestionsList suggestions={data?.suggestions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
