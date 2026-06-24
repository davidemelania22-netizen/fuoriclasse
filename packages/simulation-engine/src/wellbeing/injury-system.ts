import type { TrainingIntensity, WellbeingConfig } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { clamp } from '../util/math';

export interface InjuryRiskInput {
  injuryProneness: number;
  fatigue: number;
  recentLoad: number;
  age: number;
  injuryHistoryCount: number;
  intensity: TrainingIntensity;
  medicalQuality: number;
}

/** Weekly injury risk on a 0-100 scale (spec formula, section 4.4). */
export function computeInjuryRisk(
  input: InjuryRiskInput,
  config: WellbeingConfig,
  noise: number,
): number {
  const w = config.injury.riskWeights;
  const ageFactor = clamp((input.age - 20) * 4, 0, 100);
  const historyFactor = clamp(input.injuryHistoryCount * 15, 0, 100);
  const intensityFactor = config.injury.intensityRisk[input.intensity] ?? 50;
  const pitchFactor = 100 - config.injury.pitchQuality;
  const medicalInverse = 100 - input.medicalQuality;

  return (
    input.injuryProneness * w.proneness +
    input.fatigue * w.fatigue +
    input.recentLoad * w.recentLoad +
    ageFactor * w.age +
    historyFactor * w.history +
    intensityFactor * w.intensity +
    pitchFactor * w.pitch +
    medicalInverse * w.medicalInverse +
    noise * w.noise
  );
}

export function injuryProbability(
  risk: number,
  config: WellbeingConfig,
): number {
  return clamp(
    (risk / 100) * config.injury.weeklyBaseProbability,
    0,
    config.injury.maxWeeklyProbability,
  );
}

export interface InjuryRollResult {
  typeKey: string;
  severity: number;
  durationWeeks: number;
  recurrenceRisk: number;
  attributeImpact: number;
}

/** Roll for a weekly injury; returns the injury, or null if none occurs. */
export function rollInjury(
  input: InjuryRiskInput,
  injuryTypeKeys: readonly string[],
  config: WellbeingConfig,
  rng: RandomSource,
): InjuryRollResult | null {
  const risk = computeInjuryRisk(input, config, rng.next() * 100);
  if (!rng.chance(injuryProbability(risk, config))) {
    return null;
  }

  const band = rng.weightedPick(
    config.injury.severityBands.map((b) => ({ value: b, weight: b.weight })),
  );
  const durationWeeks = rng.integer(band.minWeeks, band.maxWeeks);
  const recurrenceRisk = clamp(
    config.injury.recurrenceBase * band.severity + input.injuryProneness / 500,
    0,
    0.6,
  );
  const typeKey =
    injuryTypeKeys.length > 0 ? rng.pick(injuryTypeKeys) : 'unknown';

  return {
    typeKey,
    severity: band.severity,
    durationWeeks,
    recurrenceRisk,
    attributeImpact: band.severity * config.injury.attributeImpactPerSeverity,
  };
}

export function recoverInjuryWeek(weeksRemaining: number): {
  weeksRemaining: number;
  healed: boolean;
} {
  const remaining = weeksRemaining - 1;
  return { weeksRemaining: Math.max(0, remaining), healed: remaining <= 0 };
}
