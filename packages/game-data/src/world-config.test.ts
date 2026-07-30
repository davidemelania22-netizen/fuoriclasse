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

  it('gives every division a full, non-overlapping set of real club names', () => {
    for (const country of COUNTRIES) {
      const pool = DEFAULT_WORLD_CONFIG.namePools[country.id]!;
      // Full coverage: no procedural names left, so A and B can never repeat.
      expect(pool.featuredClubs).toHaveLength(
        DEFAULT_WORLD_CONFIG.clubsPerTopDivision,
      );
      expect(pool.secondDivisionClubs).toHaveLength(
        DEFAULT_WORLD_CONFIG.clubsPerSecondDivision,
      );
      const all = [...pool.featuredClubs!, ...pool.secondDivisionClubs!];
      expect(new Set(all).size).toBe(all.length);
    }
  });
});
