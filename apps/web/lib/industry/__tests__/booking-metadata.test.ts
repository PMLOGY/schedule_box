import { describe, it, expect } from 'vitest';
import { bookingMetadataSchema } from '../industry-fields';

describe('bookingMetadataSchema', () => {
  it('parses valid medical metadata', () => {
    const result = bookingMetadataSchema.safeParse({
      industry_type: 'medical_clinic',
      birth_number: '123456/7890',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.industry_type).toBe('medical_clinic');
    }
  });

  it('parses valid auto metadata', () => {
    const result = bookingMetadataSchema.safeParse({
      industry_type: 'auto_service',
      license_plate: '1A2 3456',
      vin: 'ABCDE12345678901',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.industry_type).toBe('auto_service');
    }
  });

  it('rejects unknown industry_type', () => {
    const result = bookingMetadataSchema.safeParse({
      industry_type: 'unknown',
      foo: 'bar',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null (nullable)', () => {
    const result = bookingMetadataSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('accepts undefined (optional)', () => {
    const result = bookingMetadataSchema.safeParse(undefined);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });

  it('rejects VIN exceeding 17 characters', () => {
    const result = bookingMetadataSchema.safeParse({
      industry_type: 'auto_service',
      vin: 'ABCDE1234567890123', // 18 chars — too long
    });
    expect(result.success).toBe(false);
  });

  it('parses medical metadata with optional fields omitted', () => {
    const result = bookingMetadataSchema.safeParse({
      industry_type: 'medical_clinic',
    });
    expect(result.success).toBe(true);
  });

  it('parses auto metadata with optional fields omitted', () => {
    const result = bookingMetadataSchema.safeParse({
      industry_type: 'auto_service',
    });
    expect(result.success).toBe(true);
  });
});
