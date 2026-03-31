'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface MedicalFieldsProps {
  metadata: Record<string, unknown> | null;
  onSave: (metadata: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}

export function MedicalFields({ metadata, onSave, isLoading }: MedicalFieldsProps) {
  const [healthRecords, setHealthRecords] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [birthNumber, setBirthNumber] = useState('');

  useEffect(() => {
    if (metadata) {
      setHealthRecords((metadata.health_records as string) || '');
      setMedicalNotes((metadata.medical_notes as string) || '');
      setInsuranceProvider((metadata.insurance_provider as string) || '');
      setBirthNumber((metadata.birth_number as string) || '');
    }
  }, [metadata]);

  const handleSave = async () => {
    await onSave({
      ...metadata,
      health_records: healthRecords || undefined,
      medical_notes: medicalNotes || undefined,
      insurance_provider: insuranceProvider || undefined,
      birth_number: birthNumber || undefined,
    });
  };

  return (
    <Card variant="glass" className="p-6">
      <h3 className="text-lg font-semibold mb-4">Zdravotní záznam</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birth-number">Rodné číslo</Label>
            <Input
              id="birth-number"
              placeholder="NNNNNN/NNNN"
              value={birthNumber}
              onChange={(e) => setBirthNumber(e.target.value)}
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insurance-provider">Pojišťovna</Label>
            <Input
              id="insurance-provider"
              placeholder="VZP / ČPZP / OZP..."
              value={insuranceProvider}
              onChange={(e) => setInsuranceProvider(e.target.value)}
              maxLength={100}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="health-records">Zdravotní záznamy</Label>
          <Textarea
            id="health-records"
            placeholder="Alergie, chronická onemocnění..."
            value={healthRecords}
            onChange={(e) => setHealthRecords(e.target.value)}
            rows={6}
            maxLength={5000}
            className="resize-y"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="medical-notes">Lékařské poznámky</Label>
          <Textarea
            id="medical-notes"
            placeholder="Poznámky k pacientovi..."
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            rows={4}
            maxLength={5000}
            className="resize-y"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Ukládání...' : 'Uložit'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
