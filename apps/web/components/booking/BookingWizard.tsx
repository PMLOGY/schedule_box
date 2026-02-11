'use client';

import { useBookingWizard } from '@/stores/booking-wizard.store';
import { StepIndicator } from './StepIndicator';
import { Step1ServiceSelect } from './Step1ServiceSelect';
import { Step2DateTimeSelect } from './Step2DateTimeSelect';
import { Step3CustomerInfo } from './Step3CustomerInfo';
import { Step4Confirmation } from './Step4Confirmation';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function BookingWizard() {
  const { step, error } = useBookingWizard();

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="pt-6">
          <StepIndicator currentStep={step} />

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && <Step1ServiceSelect />}
          {step === 2 && <Step2DateTimeSelect />}
          {step === 3 && <Step3CustomerInfo />}
          {step === 4 && <Step4Confirmation />}
        </CardContent>
      </Card>
    </div>
  );
}
