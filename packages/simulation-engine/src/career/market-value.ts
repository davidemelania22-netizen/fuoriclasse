import type { CareerConfig } from '@football-life/shared';
import { clamp } from '../util/math';

export interface MarketValueInput {
  currentAbility: number;
  potentialAbility: number;
  age: number;
  form: number;
  reputation: number;
  contractYearsRemaining: number;
  leagueReputation: number;
}

function ageCoefficient(age: number, config: CareerConfig): number {
  for (const band of config.marketValue.ageCoefficients) {
    if (age <= band.maxAge) return band.coefficient;
  }
  const last =
    config.marketValue.ageCoefficients[
      config.marketValue.ageCoefficients.length - 1
    ];
  return last ? last.coefficient : 0;
}

/** Estimate a player's market value from ability, age, potential and context. */
export function computeMarketValue(
  input: MarketValueInput,
  config: CareerConfig,
): number {
  const mv = config.marketValue;
  const base =
    Math.max(0, input.currentAbility - mv.abilityFloor) ** mv.abilityExponent;
  const leagueFactor = clamp(
    0.6 + 0.4 * (input.leagueReputation / mv.leagueReferenceReputation),
    0.5,
    1.8,
  );
  const formFactor = 0.9 + input.form / 500;
  const contractFactor =
    0.8 + (clamp(input.contractYearsRemaining, 0, 5) / 5) * 0.4;
  const potentialPremium =
    1 +
    (Math.max(0, input.potentialAbility - input.currentAbility) / 100) *
      mv.potentialWeight;

  const value =
    mv.baseScale *
    base *
    ageCoefficient(input.age, config) *
    leagueFactor *
    formFactor *
    contractFactor *
    potentialPremium;

  return Math.round(Math.max(0, value));
}

/** Smooth the new value toward the previous one (spec: 0.75 prev + 0.25 new). */
export function smoothMarketValue(
  previous: number,
  calculated: number,
  config: CareerConfig,
): number {
  if (previous <= 0) return Math.round(Math.max(0, calculated));
  const s = config.marketValue.smoothing;
  return Math.round(previous * s + calculated * (1 - s));
}
