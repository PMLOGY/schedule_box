'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  endOfWeek,
} from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { Button } from '@/components/ui/button';
import { useCalendarStore } from '@/stores/calendar.store';

export function CalendarToolbar() {
  const t = useTranslations('calendar');
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
        return format(selectedDate, 'EEEE d. MMMM yyyy', { locale: cs });
      case 'week': {
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return (
          format(selectedDate, 'd. MMM', { locale: cs }) +
          ' - ' +
          format(weekEnd, 'd. MMM yyyy', { locale: cs })
        );
      }
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale: cs });
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
