import { describe, it, expect } from 'vitest';
import { getIndustryAiDefaults } from '../industry-ai-defaults';

describe('getIndustryAiDefaults', () => {
  it('disables upselling and sets individual mode for medical_clinic', () => {
    const config = getIndustryAiDefaults('medical_clinic');
    expect(config.upselling_enabled).toBe(false);
    expect(config.capacity_mode).toBe('individual');
  });

  it('enables upselling and sets group mode for fitness_gym', () => {
    const config = getIndustryAiDefaults('fitness_gym');
    expect(config.upselling_enabled).toBe(true);
    expect(config.capacity_mode).toBe('group');
  });

  it('enables upselling and sets group mode for yoga_pilates', () => {
    const config = getIndustryAiDefaults('yoga_pilates');
    expect(config.upselling_enabled).toBe(true);
    expect(config.capacity_mode).toBe('group');
  });

  it('returns defaults (upselling=true, standard mode) for general industry type', () => {
    const config = getIndustryAiDefaults('general');
    expect(config.upselling_enabled).toBe(true);
    expect(config.capacity_mode).toBe('standard');
  });

  it('returns defaults for unknown industry type', () => {
    const config = getIndustryAiDefaults('unknown_vertical');
    expect(config.upselling_enabled).toBe(true);
    expect(config.capacity_mode).toBe('standard');
  });
});
