import type { ProgressionConfig } from '@football-life/shared';

/** Resolve the age growth multiplier from the configured bands. */
export function ageGrowthMultiplier(
  age: number,
  config: ProgressionConfig,
): number {
  for (const band of config.ageGrowthBands) {
    if (age <= band.maxAge) {
      return band.multiplier;
    }
  }
  // Fall back to the last (oldest) band.
  const last = config.ageGrowthBands[config.ageGrowthBands.length - 1];
  return last ? last.multiplier : 0;
}
