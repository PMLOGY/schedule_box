import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export type OnboardingStep = 1 | 2 | 3 | 4;

export interface WorkingHourEntry {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isActive: boolean;
}

interface OnboardingData {
  // Step 1 - Company Details
  companyName?: string;
  phone?: string;
  description?: string;
  addressStreet?: string;
  addressCity?: string;
  addressZip?: string;
  industryType?: string;
  logoUrl?: string;
  // Step 2 - First Service
  serviceName?: string;
  serviceDuration?: number; // minutes
  servicePrice?: number; // CZK
  serviceDescription?: string;
  // Step 3 - Working Hours
  workingHours?: WorkingHourEntry[];
  // Step 4 - Share Link
  bookingUrl?: string;
  companySlug?: string;
}

interface OnboardingWizardState {
  step: OnboardingStep;
  data: OnboardingData;
  isSubmitting: boolean;
  error: string | null;
  completedSteps: Set<number>;
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<OnboardingData>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  markStepCompleted: (step: number) => void;
  reset: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useOnboardingWizard = create<OnboardingWizardState>((set, get) => ({
  step: 1,
  data: {},
  isSubmitting: false,
  error: null,
  completedSteps: new Set<number>(),

  setStep: (step) => {
    set({ step, error: null });
  },

  nextStep: () => {
    const currentStep = get().step;
    if (currentStep < 4) {
      set({ step: (currentStep + 1) as OnboardingStep, error: null });
    }
  },

  prevStep: () => {
    const currentStep = get().step;
    if (currentStep > 1) {
      set({ step: (currentStep - 1) as OnboardingStep, error: null });
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

  markStepCompleted: (step) => {
    set((state) => {
      const newCompleted = new Set(state.completedSteps);
      newCompleted.add(step);
      return { completedSteps: newCompleted };
    });
  },

  reset: () => {
    set({ step: 1, data: {}, isSubmitting: false, error: null, completedSteps: new Set() });
  },
}));
