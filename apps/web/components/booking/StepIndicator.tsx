import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

const steps = [
  { key: 'service', label: 'booking.wizard.steps.service' },
  { key: 'datetime', label: 'booking.wizard.steps.datetime' },
  { key: 'customer', label: 'booking.wizard.steps.customer' },
  { key: 'confirm', label: 'booking.wizard.steps.confirm' },
] as const;

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const t = useTranslations();

  return (
    <div
      className="w-full py-6"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={4}
      aria-label={`Step ${currentStep} of 4`}
    >
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3 | 4;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={step.key} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
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
                  {t(step.label)}
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
