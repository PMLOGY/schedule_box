'use client';

import { useOnboardingWizard } from '@/stores/onboarding-wizard.store';
import { WizardStepIndicator } from './wizard-step-indicator';
import { CompanyDetailsStep } from './steps/company-details-step';
import { FirstServiceStep } from './steps/first-service-step';
import { WorkingHoursStep } from './steps/working-hours-step';
import { ShareLinkStep } from './steps/share-link-step';
import { TestBookingStep } from './steps/test-booking-step';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function SetupWizard() {
  const { step, error, completedSteps } = useOnboardingWizard();

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          <WizardStepIndicator currentStep={step} completedSteps={completedSteps} />

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && <CompanyDetailsStep />}
          {step === 2 && <FirstServiceStep />}
          {step === 3 && <WorkingHoursStep />}
          {step === 4 && <ShareLinkStep />}
          {step === 5 && <TestBookingStep />}
        </CardContent>
      </Card>
    </div>
  );
}
