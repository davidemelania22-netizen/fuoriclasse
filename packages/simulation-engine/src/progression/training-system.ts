import {
  AttributeCategory,
  type ProgressionConfig,
  type TrainingIntensity,
} from '@football-life/shared';
import { clamp, mean } from '../util/math';
import { ageGrowthMultiplier } from './age';
import type {
  AttributeChange,
  ClubTrainingContext,
  PlayerProgressState,
} from './types';

export interface WeeklyTrainingParams {
  player: PlayerProgressState;
  age: number;
  club: ClubTrainingContext;
  intensity: TrainingIntensity;
  focus?: AttributeCategory | null;
  /** Useful match minutes accrued over the week (0 when no matches). */
  usefulMinutes: number;
  difficultyModifier: number;
  config: ProgressionConfig;
}

export interface WeeklyTrainingResult {
  player: PlayerProgressState;
  abilityGrowth: number;
  fatigueDelta: number;
  changedAttributes: AttributeChange[];
}

function attributeValue(
  attributes: readonly { key: string; value: number }[],
  key: string,
  fallback: number,
): number {
  return attributes.find((a) => a.key === key)?.value ?? fallback;
}

export function applyWeeklyTraining(
  params: WeeklyTrainingParams,
): WeeklyTrainingResult {
  const { player, age, club, intensity, config } = params;
  const focus = params.focus ?? null;
  const weights = config.growthWeights;

  const professionalism = attributeValue(
    player.attributes,
    'professionalism',
    50,
  );
  const determination = attributeValue(player.attributes, 'determination', 50);
  const potentialResidual = Math.max(
    0,
    player.potentialAbility - player.currentAbility,
  );
  const usefulMinutesNorm = clamp(params.usefulMinutes / 1.8, 0, 100);

  const growthBase =
    club.trainingQuality * weights.trainingQuality +
    club.staffQuality * weights.staffQuality +
    professionalism * weights.professionalism +
    determination * weights.determination +
    potentialResidual * weights.potentialResidual +
    player.motivation * weights.motivation +
    usefulMinutesNorm * weights.usefulMinutes;

  const intensityEntry = config.intensity[intensity];
  const growthMultiplier = intensityEntry?.growthMultiplier ?? 1;
  const fatigueLoad = intensityEntry?.fatigue ?? 12;

  const fatigueModifier = clamp(1 - player.fatigue / 200, 0.4, 1);
  const moraleModifier = clamp(0.7 + player.morale / 333, 0.7, 1.05);

  const rawGrowth =
    growthBase *
    ageGrowthMultiplier(age, config) *
    growthMultiplier *
    fatigueModifier *
    moraleModifier *
    params.difficultyModifier *
    config.growthScale;

  // Taper to zero as the player approaches their potential.
  const growth = Math.max(0, rawGrowth) * clamp(potentialResidual / 4, 0, 1);

  const targetAbility = Math.min(
    player.potentialAbility,
    player.currentAbility + growth,
  );
  const totalDelta = Math.max(0, targetAbility - player.currentAbility);

  const visible = player.attributes.filter(
    (a) => a.category !== AttributeCategory.Hidden,
  );
  const shareWeights = visible.map((a) =>
    focus && a.category === focus ? 2 : 1,
  );
  const weightSum = shareWeights.reduce((sum, w) => sum + w, 0) || 1;
  // Distribute enough points across visible attributes that their MEAN (which
  // defines currentAbility) rises by `totalDelta`.
  const totalPoints = totalDelta * visible.length;

  const changedAttributes: AttributeChange[] = [];
  const visibleByKey = new Map<string, number>();
  visible.forEach((attribute, index) => {
    const gain = (totalPoints * (shareWeights[index] ?? 1)) / weightSum;
    const after = clamp(attribute.value + gain, 1, 99);
    visibleByKey.set(attribute.key, after);
    if (after !== attribute.value) {
      changedAttributes.push({
        key: attribute.key,
        before: attribute.value,
        after,
      });
    }
  });

  const nextAttributes = player.attributes.map((attribute) =>
    visibleByKey.has(attribute.key)
      ? { ...attribute, value: visibleByKey.get(attribute.key)! }
      : attribute,
  );
  const nextCurrentAbility = mean(
    nextAttributes
      .filter((a) => a.category !== AttributeCategory.Hidden)
      .map((a) => a.value),
  );

  // Recovery: fatigue accrues from load, recedes with recovery capacity.
  const physicalRecovery = attributeValue(
    player.attributes,
    'physicalRecovery',
    50,
  );
  const recovery = config.recovery;
  const agePenalty =
    Math.max(0, age - recovery.agePenaltyStart) * recovery.agePenaltyPerYear;
  const weeklyRecovery = Math.max(
    0,
    recovery.base +
      physicalRecovery * recovery.physicalRecoveryFactor +
      club.medicalQuality * recovery.medicalFactor -
      agePenalty,
  );
  // Shedding a share of what has already accumulated is what gives fatigue an
  // equilibrium instead of a verdict: with a flat recovery alone the load
  // either always won or — as it did — always lost, and condition never moved.
  const shed = player.fatigue * recovery.sheddingRate;
  const fatigueDelta = fatigueLoad - weeklyRecovery - shed;
  const nextFatigue = clamp(player.fatigue + fatigueDelta, 0, 100);
  const nextCondition = clamp(100 - 0.9 * nextFatigue, 10, 100);

  return {
    player: {
      ...player,
      attributes: nextAttributes,
      currentAbility: nextCurrentAbility,
      fatigue: nextFatigue,
      condition: nextCondition,
    },
    abilityGrowth: nextCurrentAbility - player.currentAbility,
    fatigueDelta: nextFatigue - player.fatigue,
    changedAttributes,
  };
}
