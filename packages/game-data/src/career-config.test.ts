import { describe, expect, it } from 'vitest';
import { SquadRole, careerConfigSchema } from '@football-life/shared';
import { DEFAULT_CAREER_CONFIG } from './career-config';

describe('DEFAULT_CAREER_CONFIG', () => {
  it('passes Zod schema validation', () => {
    expect(() => careerConfigSchema.parse(DEFAULT_CAREER_CONFIG)).not.toThrow();
  });

  it('defines a wage multiplier for every squad role', () => {
    for (const role of Object.values(SquadRole)) {
      expect(DEFAULT_CAREER_CONFIG.wage.roleMultipliers[role]).toBeDefined();
    }
  });
});
