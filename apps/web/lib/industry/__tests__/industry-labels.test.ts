import { describe, it, expect } from 'vitest';
import { getIndustryLabels } from '../industry-labels';

describe('getIndustryLabels', () => {
  it('returns Pacient/Termín/Vyšetření for medical_clinic', () => {
    const labels = getIndustryLabels('medical_clinic');
    expect(labels.customer).toBe('Pacient');
    expect(labels.booking).toBe('Termín');
    expect(labels.service).toBe('Vyšetření');
  });

  it('returns Vozidlo/Zakázka/Servis for auto_service', () => {
    const labels = getIndustryLabels('auto_service');
    expect(labels.customer).toBe('Vozidlo');
    expect(labels.booking).toBe('Zakázka');
    expect(labels.service).toBe('Servis');
  });

  it('returns default Czech labels for general industry type', () => {
    const labels = getIndustryLabels('general');
    expect(labels.customer).toBe('Zákazník');
    expect(labels.booking).toBe('Rezervace');
    expect(labels.service).toBe('Služba');
  });

  it('falls back to defaults for unknown industry type', () => {
    const labels = getIndustryLabels('unknown_vertical');
    expect(labels.customer).toBe('Zákazník');
    expect(labels.booking).toBe('Rezervace');
    expect(labels.service).toBe('Služba');
    expect(labels.newBooking).toBe('Nová rezervace');
    expect(labels.customerSearch).toBe('Hledat zákazníka');
    expect(labels.bookingDetail).toBe('Detail rezervace');
    expect(labels.serviceList).toBe('Seznam služeb');
  });

  it('medical_clinic has full label set', () => {
    const labels = getIndustryLabels('medical_clinic');
    expect(labels.newBooking).toBe('Nový termín');
    expect(labels.customerSearch).toBe('Hledat pacienta');
    expect(labels.bookingDetail).toBe('Detail termínu');
    expect(labels.serviceList).toBe('Seznam vyšetření');
  });

  it('auto_service has full label set', () => {
    const labels = getIndustryLabels('auto_service');
    expect(labels.newBooking).toBe('Nová zakázka');
    expect(labels.customerSearch).toBe('Hledat vozidlo');
    expect(labels.bookingDetail).toBe('Detail zakázky');
    expect(labels.serviceList).toBe('Seznam servisu');
  });
});
