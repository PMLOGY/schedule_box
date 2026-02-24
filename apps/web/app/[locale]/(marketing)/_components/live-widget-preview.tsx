'use client';

import { useTranslations } from 'next-intl';
import { Calendar, Clock, User, ChevronRight } from 'lucide-react';

export function LiveWidgetPreview() {
  const t = useTranslations('landing.hero');

  return (
    <div className="rounded-xl border bg-white shadow-2xl overflow-hidden">
      {/* Browser chrome mock */}
      <div className="flex items-center gap-1.5 border-b bg-gray-100 px-3 py-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <div className="ml-2 flex-1 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-400">
          schedulebox.cz/embed/salon-krasa
        </div>
      </div>

      {/* Static widget mockup */}
      <div className="p-6 space-y-5">
        {/* Widget header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('widgetBusiness')}</h3>
          <p className="text-sm text-gray-500">{t('widgetSubtitle')}</p>
        </div>

        {/* Service cards */}
        <div className="space-y-3">
          {[
            { name: t('widgetService1'), duration: '60 min', price: '890 Kč' },
            { name: t('widgetService2'), duration: '30 min', price: '450 Kč' },
            { name: t('widgetService3'), duration: '45 min', price: '590 Kč' },
          ].map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">{service.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {service.duration}
                  </span>
                  <span className="font-medium text-gray-700">{service.price}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          ))}
        </div>

        {/* Mock calendar strip */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4" />
            {t('widgetSelectDate')}
          </div>
          <div className="flex gap-2">
            {['Po', 'Út', 'St', 'Čt', 'Pá'].map((day, i) => (
              <div
                key={day}
                className={`flex-1 rounded-lg border py-2 text-center text-xs ${
                  i === 2
                    ? 'border-primary bg-primary text-white'
                    : 'text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{day}</div>
                <div className="mt-0.5">{24 + i}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mock time slots */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <User className="h-4 w-4" />
            {t('widgetSelectTime')}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['9:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time, i) => (
              <div
                key={time}
                className={`rounded-md border py-2 text-center text-xs font-medium ${
                  i === 1
                    ? 'border-primary bg-primary text-white'
                    : 'text-gray-600 hover:border-gray-300'
                }`}
              >
                {time}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-gray-400">Powered by ScheduleBox</div>
      </div>
    </div>
  );
}
