import { describe, expect, it } from 'vitest';
import {
  TrainingIntensity,
  progressionConfigSchema,
} from '@football-life/shared';
import { DEFAULT_PROGRESSION_CONFIG } from './progression-config';

describe('DEFAULT_PROGRESSION_CONFIG', () => {
  it('passes Zod schema validation', () => {
    expect(() =>
      progressionConfigSchema.parse(DEFAULT_PROGRESSION_CONFIG),
    ).not.toThrow();
  });

  it('defines an entry for every training intensity', () => {
    for (const intensity of Object.values(TrainingIntensity)) {
      expect(DEFAULT_PROGRESSION_CONFIG.intensity[intensity]).toBeDefined();
    }
  });
});
