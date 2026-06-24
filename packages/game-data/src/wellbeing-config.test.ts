import { describe, expect, it } from 'vitest';
import {
  TrainingIntensity,
  wellbeingConfigSchema,
} from '@football-life/shared';
import { DEFAULT_WELLBEING_CONFIG, INJURY_TYPES } from './wellbeing-config';

describe('DEFAULT_WELLBEING_CONFIG', () => {
  it('passes Zod schema validation', () => {
    expect(() =>
      wellbeingConfigSchema.parse(DEFAULT_WELLBEING_CONFIG),
    ).not.toThrow();
  });

  it('covers every training intensity for risk and stress', () => {
    for (const intensity of Object.values(TrainingIntensity)) {
      expect(
        DEFAULT_WELLBEING_CONFIG.injury.intensityRisk[intensity],
      ).toBeDefined();
      expect(
        DEFAULT_WELLBEING_CONFIG.stress.intensityStress[intensity],
      ).toBeDefined();
    }
  });

  it('ships a non-empty injury catalogue', () => {
    expect(INJURY_TYPES.length).toBeGreaterThanOrEqual(10);
  });
});
