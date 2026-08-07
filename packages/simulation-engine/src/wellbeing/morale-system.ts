import type { TrainingIntensity, WellbeingConfig } from '@football-life/shared';
import { clamp } from '../util/math';

export interface MoraleInput {
  morale: number;
  injured: boolean;
  stress: number;
  supportModifier?: number;
}

export function updateMorale(
  input: MoraleInput,
  config: WellbeingConfig,
): number {
  const m = config.morale;
  let value = input.morale + (m.baseline - input.morale) * m.regression;
  if (input.injured) value -= m.injuryPenalty;
  if (input.stress > m.stressThreshold) value -= m.highStressPenalty;
  value += input.supportModifier ?? 0;
  return clamp(value, 0, 100);
}

export interface StressInput {
  stress: number;
  injured: boolean;
  intensity: TrainingIntensity;
}

export function updateStress(
  input: StressInput,
  config: WellbeingConfig,
): number {
  const s = config.stress;
  const intensityStress = s.intensityStress[input.intensity] ?? 0;
  let value =
    input.stress + intensityStress - s.decay - input.stress * s.sheddingRate;
  if (input.injured) value += s.injuryStress;
  return clamp(value, 0, 100);
}

export function updateMentalHealth(
  mentalHealth: number,
  stress: number,
  config: WellbeingConfig,
): number {
  const target = clamp(
    100 - stress * config.mentalHealth.stressInfluence,
    0,
    100,
  );
  return clamp(
    mentalHealth + (target - mentalHealth) * config.mentalHealth.recovery,
    0,
    100,
  );
}
