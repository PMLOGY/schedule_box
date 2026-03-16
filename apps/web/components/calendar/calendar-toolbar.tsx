'use client';

import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { sk } from 'date-fns/locale/sk';
import { enUS } from 'date-fns/locale/en-US';
import { Button } from '@/components/ui/button';
import { useCalendarStore } from '@/stores/calendar.store';

const DATE_LOCALES: Record<string, Locale> = { cs, sk, en: enUS };

export function CalendarToolbar() {
  const t = useTranslations('calendar');
  const locale = useLocale();
  const dateLocale = DATE_LOCALES[locale] ?? cs;
  const { view, selectedDate, setView, setSelectedDate } = useCalendarStore();

  const handlePrev = () => {
    switch (view) {
      case 'day':
        setSelectedDate(subDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case 'month':
        setSelectedDate(subMonths(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'day':
        setSelectedDate(addDays(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const formatDateLabel = () => {
    switch (view) {
      case 'day':
        return format(selectedDate, 'EEEE d. MMMM yyyy', { locale: dateLocale });
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'd. MMM', { locale: dateLocale })} – ${format(weekEnd, 'd. MMM yyyy', { locale: dateLocale })}`;
      }
      case 'month':
        return format(selectedDate, 'LLLL yyyy', { locale: dateLocale });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Previous period">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={handleToday}>
          {t('today')}
        </Button>
        <Button variant="outline" size="icon" onClick={handleNext} aria-label="Next period">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <h2 className="text-lg font-semibold capitalize">{formatDateLabel()}</h2>

      <div className="flex items-center gap-1">
        <Button
          variant={view === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('day')}
        >
          {t('day')}
        </Button>
        <Button
          variant={view === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('week')}
        >
          {t('week')}
        </Button>
        <Button
          variant={view === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('month')}
        >
          {t('month')}
        </Button>
      </div>
    </div>
  );
}
