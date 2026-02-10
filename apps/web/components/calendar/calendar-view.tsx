'use client';

import { useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useCalendarStore } from '@/stores/calendar.store';
import '../../styles/calendar.css';

const resources = [
  { id: '1', title: 'Jana Novakova' },
  { id: '2', title: 'Petr Svoboda' },
  { id: '3', title: 'Marie Dvorakova' },
  { id: '4', title: 'Tomas Cerny' },
];

function createMockEvents() {
  const today = new Date();
  const makeTime = (hours: number, minutes: number) => {
    const d = new Date(today);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  return [
    {
      id: '1',
      resourceId: '1',
      title: 'Strih + Barva',
      start: makeTime(9, 0),
      end: makeTime(10, 30),
      backgroundColor: '#3B82F6',
    },
    {
      id: '2',
      resourceId: '2',
      title: 'Pansky strih',
      start: makeTime(10, 0),
      end: makeTime(10, 45),
      backgroundColor: '#22C55E',
    },
    {
      id: '3',
      resourceId: '1',
      title: 'Manikura',
      start: makeTime(11, 0),
      end: makeTime(12, 0),
      backgroundColor: '#F59E0B',
    },
    {
      id: '4',
      resourceId: '3',
      title: 'Masaz',
      start: makeTime(14, 0),
      end: makeTime(15, 0),
      backgroundColor: '#8B5CF6',
    },
    {
      id: '5',
      resourceId: '4',
      title: 'Pedikura',
      start: makeTime(9, 30),
      end: makeTime(10, 30),
      backgroundColor: '#EC4899',
    },
    {
      id: '6',
      resourceId: '2',
      title: 'Barveni',
      start: makeTime(13, 0),
      end: makeTime(14, 30),
      backgroundColor: '#3B82F6',
    },
  ];
}

export function CalendarView() {
  const calendarRef = useRef<FullCalendar>(null);
  const { view, selectedDate, selectedEmployeeIds } = useCalendarStore();

  const events = useMemo(() => createMockEvents(), []);

  const filteredResources = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return resources;
    return resources.filter((r) => selectedEmployeeIds.includes(r.id));
  }, [selectedEmployeeIds]);

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    if (calendarApi.view.type !== view) {
      calendarApi.changeView(view);
    }
  }, [view]);

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;
    calendarApi.gotoDate(selectedDate);
  }, [selectedDate]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin, dayGridPlugin]}
        initialView={view}
        initialDate={selectedDate}
        resources={filteredResources}
        events={events}
        headerToolbar={false}
        slotDuration="00:15:00"
        snapDuration="00:15:00"
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        height="auto"
        locale="cs"
        selectable={true}
        editable={true}
        eventClick={(info) => console.log('Event clicked:', info.event.id)}
        select={(info) => console.log('Selected:', info.startStr, info.endStr)}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
      />
    </div>
  );
}
