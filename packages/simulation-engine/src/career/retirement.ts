import type { RetirementConfig } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { clamp } from '../util/math';

export interface RetirementDecisionInput {
  age: number;
  currentAbility: number;
  peakAbility: number;
  config: RetirementConfig;
  rng: RandomSource;
}

/** Decide whether a player retires this season. */
export function shouldRetire(input: RetirementDecisionInput): boolean {
  const { age, config } = input;
  if (age >= config.forcedRetirementAge) return true;
  if (age < config.minRetirementAge) return false;

  const yearsOver = age - config.minRetirementAge;
  let chance = yearsOver * config.baseChancePerYearOver;
  if (
    input.peakAbility - input.currentAbility >
    config.abilityDeclineThreshold
  ) {
    chance += config.declineChanceBonus;
  }
  return input.rng.chance(clamp(chance, 0, 1));
}

export interface LegacyInput {
  peakAbility: number;
  careerYears: number;
  peakMarketValue: number;
}

/**
 * A single career score combining peak quality, longevity, an elite bonus and
 * economic peak — a proxy for the spec's career score components.
 */
export function computeLegacyScore(input: LegacyInput): number {
  return Math.round(
    input.peakAbility * 8 +
      input.careerYears * 6 +
      Math.max(0, input.peakAbility - 75) * 12 +
      input.peakMarketValue / 1_000_000,
  );
}
