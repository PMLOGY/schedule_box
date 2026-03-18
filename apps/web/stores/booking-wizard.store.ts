import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

interface BookingWizardData {
  // Step 1
  serviceId?: number;
  serviceName?: string;
  serviceDuration?: number;
  servicePrice?: string;
  // Step 2
  employeeId?: number;
  employeeName?: string;
  selectedDate?: string; // YYYY-MM-DD
  startTime?: string; // ISO 8601 datetime
  endTime?: string; // ISO 8601 datetime
  displayTime?: string; // HH:mm for display
  // Step 3
  customerId?: number; // Existing customer
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  bookingMetadata?: Record<string, string> | null;
}

interface BookingWizardState {
  step: 1 | 2 | 3 | 4;
  data: BookingWizardData;
  isSubmitting: boolean;
  error: string | null;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<BookingWizardData>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useBookingWizard = create<BookingWizardState>((set, get) => ({
  step: 1,
  data: {},
  isSubmitting: false,
  error: null,

  setStep: (step) => {
    set({ step, error: null });
  },

  nextStep: () => {
    const currentStep = get().step;
    if (currentStep < 4) {
      set({ step: (currentStep + 1) as 1 | 2 | 3 | 4, error: null });
    }
  },

  prevStep: () => {
    const currentStep = get().step;
    if (currentStep > 1) {
      set({ step: (currentStep - 1) as 1 | 2 | 3 | 4, error: null });
    }
  },

  updateData: (data) => {
    set((state) => ({
      data: { ...state.data, ...data },
    }));
  },

  setSubmitting: (isSubmitting) => {
    set({ isSubmitting });
  },

  setError: (error) => {
    set({ error });
  },

  reset: () => {
    set({ step: 1, data: {}, isSubmitting: false, error: null });
  },
}));
