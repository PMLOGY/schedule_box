import { create } from 'zustand';

type CalendarView = 'day' | 'week' | 'month' | 'agenda';

interface CalendarState {
  view: CalendarView;
  selectedDate: Date;
  selectedEmployeeIds: string[];
  showCancelled: boolean;
  setView: (view: CalendarView) => void;
  setSelectedDate: (date: Date) => void;
  toggleEmployee: (id: string) => void;
  setEmployeeFilter: (ids: string[]) => void;
  toggleShowCancelled: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  view: 'day',
  selectedDate: new Date(),
  selectedEmployeeIds: [],
  showCancelled: false,

  setView: (view: CalendarView) => {
    set({ view });
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
  },

  toggleEmployee: (id: string) => {
    set((state) => {
      const isSelected = state.selectedEmployeeIds.includes(id);
      return {
        selectedEmployeeIds: isSelected
          ? state.selectedEmployeeIds.filter((empId) => empId !== id)
          : [...state.selectedEmployeeIds, id],
      };
    });
  },

  setEmployeeFilter: (ids: string[]) => {
    set({ selectedEmployeeIds: ids });
  },

  toggleShowCancelled: () => {
    set((state) => ({ showCancelled: !state.showCancelled }));
  },
}));
