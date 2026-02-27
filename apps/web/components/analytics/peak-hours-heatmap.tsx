'use client';

/**
 * Peak Hours Heatmap
 * CSS grid-based heatmap showing booking density by day of week and hour
 * NOT a Recharts component - uses custom Tailwind grid
 */

import { useMemo } from 'react';
import type { PeakHourData } from '@/hooks/use-extended-analytics';

interface PeakHoursHeatmapProps {
  data: PeakHourData[];
}

// Czech day labels (Monday first)
// API returns dayOfWeek: 0=Sun, 1=Mon ... 6=Sat
// We display Mon-Sun so reorder: [1,2,3,4,5,6,0]
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['Po', 'Ut', 'St', 'Ct', 'Pa', 'So', 'Ne'];

// Show hours 6-22 (business hours) to keep heatmap compact
const HOUR_START = 6;
const HOUR_END = 22;

function getHeatColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return 'bg-gray-50 dark:bg-gray-900';

  const intensity = count / maxCount;

  if (intensity < 0.2) return 'bg-blue-100 dark:bg-blue-950';
  if (intensity < 0.4) return 'bg-blue-200 dark:bg-blue-900';
  if (intensity < 0.6) return 'bg-blue-400 dark:bg-blue-700';
  if (intensity < 0.8) return 'bg-blue-500 dark:bg-blue-600';
  return 'bg-blue-700 dark:bg-blue-500';
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  // Build 7x24 grid and find max count
  const { grid, maxCount } = useMemo(() => {
    const g: Record<string, number> = {};
    let max = 0;

    for (const item of data) {
      const key = `${item.dayOfWeek}-${item.hour}`;
      g[key] = item.count;
      if (item.count > max) max = item.count;
    }

    return { grid: g, maxCount: max };
  }, [data]);

  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

  return (
    <div>
      <div className="text-sm font-medium mb-4">Vytizenost podle hodin</div>
      <div className="text-xs text-muted-foreground mb-2">
        Zobrazeny hodiny 6:00-22:00 (provozni doba)
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-[500px]">
          {/* Header row: hour labels */}
          <div className="flex">
            <div className="w-8 shrink-0" />
            {hours.map((hour) => (
              <div key={hour} className="flex-1 text-center text-xs text-muted-foreground pb-1">
                {hour}
              </div>
            ))}
          </div>

          {/* Data rows: one per day */}
          {DAY_ORDER.map((dow, dayIndex) => (
            <div key={dow} className="flex items-center">
              {/* Day label */}
              <div className="w-8 shrink-0 text-xs font-medium text-muted-foreground pr-1 text-right">
                {DAY_LABELS[dayIndex]}
              </div>

              {/* Hour cells */}
              {hours.map((hour) => {
                const count = grid[`${dow}-${hour}`] || 0;
                const colorClass = getHeatColor(count, maxCount);

                return (
                  <div
                    key={`${dow}-${hour}`}
                    className={`flex-1 aspect-square m-[1px] rounded-sm ${colorClass} cursor-default transition-colors`}
                    title={`${DAY_LABELS[dayIndex]} ${hour}:00 - ${count} rezervaci`}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Min</span>
            <div className="flex gap-[1px]">
              <div className="w-4 h-4 rounded-sm bg-gray-50 dark:bg-gray-900" />
              <div className="w-4 h-4 rounded-sm bg-blue-100 dark:bg-blue-950" />
              <div className="w-4 h-4 rounded-sm bg-blue-200 dark:bg-blue-900" />
              <div className="w-4 h-4 rounded-sm bg-blue-400 dark:bg-blue-700" />
              <div className="w-4 h-4 rounded-sm bg-blue-500 dark:bg-blue-600" />
              <div className="w-4 h-4 rounded-sm bg-blue-700 dark:bg-blue-500" />
            </div>
            <span>Max</span>
          </div>
        </div>
      </div>
    </div>
  );
}
