import { describe, expect, it } from 'vitest';
import { retirementConfigSchema } from '@football-life/shared';
import { DEFAULT_RETIREMENT_CONFIG } from './retirement-config';

describe('DEFAULT_RETIREMENT_CONFIG', () => {
  it('passes Zod schema validation', () => {
    expect(() =>
      retirementConfigSchema.parse(DEFAULT_RETIREMENT_CONFIG),
    ).not.toThrow();
  });

  it('has a minimum age below the forced retirement age', () => {
    expect(DEFAULT_RETIREMENT_CONFIG.minRetirementAge).toBeLessThan(
      DEFAULT_RETIREMENT_CONFIG.forcedRetirementAge,
    );
  });
});
