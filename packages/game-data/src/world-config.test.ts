import { describe, expect, it } from 'vitest';
import { worldGenerationConfigSchema } from '@football-life/shared';
import { COUNTRIES } from './countries';
import { DEFAULT_WORLD_CONFIG } from './world-config';

describe('DEFAULT_WORLD_CONFIG', () => {
  it('passes Zod schema validation', () => {
    expect(() =>
      worldGenerationConfigSchema.parse(DEFAULT_WORLD_CONFIG),
    ).not.toThrow();
  });

  it('provides a name pool for every seeded country', () => {
    for (const country of COUNTRIES) {
      const pool = DEFAULT_WORLD_CONFIG.namePools[country.id];
      expect(pool).toBeDefined();
      expect(pool?.cities.length).toBeGreaterThanOrEqual(
        DEFAULT_WORLD_CONFIG.clubsPerTopDivision,
      );
    }
  });
});
