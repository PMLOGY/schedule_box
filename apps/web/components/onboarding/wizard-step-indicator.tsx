'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  completedSteps: Set<number>;
}

const steps = [
  { key: 'company', labelKey: 'onboarding.steps.company' },
  { key: 'service', labelKey: 'onboarding.steps.service' },
  { key: 'hours', labelKey: 'onboarding.steps.hours' },
  { key: 'share', labelKey: 'onboarding.steps.share' },
  { key: 'testBooking', labelKey: 'onboarding.steps.testBooking' },
] as const;

export function WizardStepIndicator({ currentStep, completedSteps }: WizardStepIndicatorProps) {
  const t = useTranslations();

  return (
    <div
      className="w-full py-6"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={5}
      aria-label={`Step ${currentStep} of 5`}
    >
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3 | 4 | 5;
          const isCompleted = completedSteps.has(stepNumber);
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={step.key} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors',
                    {
                      'border-primary bg-primary text-primary-foreground': isCompleted || isCurrent,
                      'border-muted bg-background text-muted-foreground':
                        !isCompleted && !isCurrent,
                    },
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{stepNumber}</span>
                  )}
                </div>
                {/* Step Label - hidden on mobile */}
                <span
                  className={cn('mt-2 text-sm font-medium hidden md:block', {
                    'text-foreground': isCurrent,
                    'text-muted-foreground': !isCurrent,
                  })}
                >
                  {t(step.labelKey)}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn('h-0.5 flex-1 mx-2', {
                    'bg-primary': isCompleted,
                    'bg-muted': !isCompleted,
                  })}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
