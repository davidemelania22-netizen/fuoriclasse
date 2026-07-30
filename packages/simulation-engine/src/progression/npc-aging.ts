import type { ProgressionConfig } from '@football-life/shared';
import { clamp } from '../util/math';

export interface NpcSeasonAbilityInput {
  currentAbility: number;
  potentialAbility: number;
  /** Age at the start of the new season. */
  age: number;
  config: ProgressionConfig;
}

/**
 * Season-over-season ability projection for a background (NPC) player at the
 * currentAbility level — individual attributes are only tracked in detail for
 * the protagonist. Young players climb toward their potential (faster the
 * younger they are), players past the decay age decline (faster the older they
 * are), and players in their prime hold steady.
 */
export function projectNpcSeasonAbility(input: NpcSeasonAbilityInput): number {
  const { currentAbility, potentialAbility, age, config } = input;

  if (age >= config.decay.startAge) {
    const yearsOver = age - config.decay.startAge + 1;
    const acceleration = 1 + (yearsOver - 1) * 0.3;
    const decline = config.decay.basePerYear * acceleration;
    return clamp(currentAbility - decline, 1, 99);
  }

  const gap = potentialAbility - currentAbility;
  if (gap <= 0) return currentAbility;

  const band = config.ageGrowthBands.find((b) => age <= b.maxAge);
  const multiplier = band ? band.multiplier : 0.1;
  const growth = Math.min(gap, gap * 0.28 * multiplier + multiplier);
  return clamp(currentAbility + growth, 1, potentialAbility);
}
