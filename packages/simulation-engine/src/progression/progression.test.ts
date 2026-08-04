import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_DEFINITIONS,
  AttributeCategory,
  type ProgressionConfig,
  TrainingIntensity,
} from '@football-life/shared';
import { mean } from '../util/math';
import { applyWeeklyTraining } from './training-system';
import { applySeasonalAging } from './aging-system';
import type { ClubTrainingContext, PlayerProgressState } from './types';

const config: ProgressionConfig = {
  growthWeights: {
    trainingQuality: 0.22,
    staffQuality: 0.12,
    professionalism: 0.18,
    determination: 0.12,
    potentialResidual: 0.2,
    motivation: 0.08,
    usefulMinutes: 0.08,
  },
  growthScale: 0.004,
  ageGrowthBands: [
    { maxAge: 16, multiplier: 1.35 },
    { maxAge: 19, multiplier: 1.2 },
    { maxAge: 22, multiplier: 1.05 },
    { maxAge: 26, multiplier: 0.65 },
    { maxAge: 29, multiplier: 0.3 },
    { maxAge: 200, multiplier: 0.1 },
  ],
  intensity: {
    REST: { growthMultiplier: 0.2, fatigue: 0 },
    LIGHT: { growthMultiplier: 0.7, fatigue: 6 },
    NORMAL: { growthMultiplier: 1.0, fatigue: 12 },
    INTENSE: { growthMultiplier: 1.25, fatigue: 22 },
  },
  recovery: {
    base: 12,
    physicalRecoveryFactor: 0.12,
    medicalFactor: 0.1,
    agePenaltyStart: 30,
    agePenaltyPerYear: 0.6,
    sheddingRate: 0.25,
  },
  decay: {
    startAge: 30,
    basePerYear: 1.4,
    attributeMultipliers: {
      acceleration: 1.0,
      pace: 1.0,
      strength: 0.4,
    },
    defaultMultiplier: 0.1,
    mentalGrowthPerYear: 0.5,
    mentalGrowthStartAge: 24,
  },
  defaultClubQuality: { training: 45, staff: 45, medical: 45 },
};

const club: ClubTrainingContext = {
  trainingQuality: 60,
  staffQuality: 55,
  medicalQuality: 50,
};

function makePlayer(
  overrides: Partial<PlayerProgressState> = {},
  visibleValue = 25,
): PlayerProgressState {
  const attributes = ATTRIBUTE_DEFINITIONS.map((definition) => ({
    key: definition.key,
    category: definition.category,
    value: definition.category === AttributeCategory.Hidden ? 50 : visibleValue,
  }));
  return {
    currentAbility: visibleValue,
    potentialAbility: 70,
    attributes,
    condition: 100,
    fatigue: 0,
    morale: 60,
    motivation: 70,
    ...overrides,
  };
}

function visibleMean(player: PlayerProgressState): number {
  return mean(
    player.attributes
      .filter((a) => a.category !== AttributeCategory.Hidden)
      .map((a) => a.value),
  );
}

describe('applyWeeklyTraining', () => {
  it('grows a young, high-potential player over a season', () => {
    let player = makePlayer();
    for (let week = 0; week < 30; week += 1) {
      player = applyWeeklyTraining({
        player,
        age: 15,
        club,
        intensity: TrainingIntensity.Normal,
        usefulMinutes: 0,
        difficultyModifier: 1,
        config,
      }).player;
    }
    expect(player.currentAbility).toBeGreaterThan(28);
    expect(player.currentAbility).toBeLessThanOrEqual(player.potentialAbility);
  });

  it('tapers growth to near zero at the potential ceiling', () => {
    const player = makePlayer({ potentialAbility: 70 }, 69);
    const result = applyWeeklyTraining({
      player,
      age: 18,
      club,
      intensity: TrainingIntensity.Normal,
      usefulMinutes: 0,
      difficultyModifier: 1,
      config,
    });
    expect(result.abilityGrowth).toBeLessThan(0.2);
  });

  it('is deterministic for identical inputs', () => {
    const player = makePlayer();
    const params = {
      player,
      age: 16,
      club,
      intensity: TrainingIntensity.Intense,
      usefulMinutes: 0,
      difficultyModifier: 1,
      config,
    } as const;
    expect(applyWeeklyTraining(params)).toEqual(applyWeeklyTraining(params));
  });

  it('reduces fatigue when resting', () => {
    const player = makePlayer({ fatigue: 50 });
    const result = applyWeeklyTraining({
      player,
      age: 22,
      club,
      intensity: TrainingIntensity.Rest,
      usefulMinutes: 0,
      difficultyModifier: 1,
      config,
    });
    expect(result.player.fatigue).toBeLessThan(50);
    // Condition is derived from the (now lower) fatigue.
    expect(result.player.condition).toBeGreaterThan(70);
  });

  it('accumulates fatigue under intense load with weak recovery, staying bounded', () => {
    let player = makePlayer({
      attributes: makePlayer().attributes.map((a) =>
        a.key === 'physicalRecovery' ? { ...a, value: 20 } : a,
      ),
    });
    const weakClub: ClubTrainingContext = {
      trainingQuality: 60,
      staffQuality: 55,
      medicalQuality: 20,
    };
    for (let week = 0; week < 10; week += 1) {
      player = applyWeeklyTraining({
        player,
        age: 24,
        club: weakClub,
        intensity: TrainingIntensity.Intense,
        usefulMinutes: 0,
        difficultyModifier: 1,
        config,
      }).player;
    }
    expect(player.fatigue).toBeGreaterThan(0);
    expect(player.fatigue).toBeLessThanOrEqual(100);
    expect(player.condition).toBeGreaterThanOrEqual(10);
  });

  it('never pushes attributes above 99 or ability above potential', () => {
    let player = makePlayer({ potentialAbility: 99 });
    const eliteClub: ClubTrainingContext = {
      trainingQuality: 95,
      staffQuality: 95,
      medicalQuality: 95,
    };
    for (let week = 0; week < 400; week += 1) {
      player = applyWeeklyTraining({
        player,
        age: 15,
        club: eliteClub,
        intensity: TrainingIntensity.Intense,
        usefulMinutes: 0,
        difficultyModifier: 1,
        config,
      }).player;
    }
    const maxAttribute = Math.max(
      ...player.attributes
        .filter((a) => a.category !== AttributeCategory.Hidden)
        .map((a) => a.value),
    );
    expect(maxAttribute).toBeLessThanOrEqual(99);
    expect(player.currentAbility).toBeLessThanOrEqual(99);
  });
});

describe('applySeasonalAging', () => {
  it('decays an older player, hitting pace harder than technique', () => {
    const player = makePlayer({ potentialAbility: 90 }, 80);
    const paceBefore = player.attributes.find((a) => a.key === 'pace')!.value;
    const techBefore = player.attributes.find(
      (a) => a.key === 'technique',
    )!.value;

    const result = applySeasonalAging({ player, age: 34, config });
    const paceAfter = result.player.attributes.find(
      (a) => a.key === 'pace',
    )!.value;
    const techAfter = result.player.attributes.find(
      (a) => a.key === 'technique',
    )!.value;

    expect(paceAfter).toBeLessThan(paceBefore);
    expect(techAfter).toBeLessThan(techBefore);
    expect(paceBefore - paceAfter).toBeGreaterThan(techBefore - techAfter);
    expect(result.abilityDelta).toBeLessThan(0);
  });

  it('does not physically decay a player below the decay age', () => {
    const player = makePlayer({ potentialAbility: 80 }, 60);
    const result = applySeasonalAging({ player, age: 20, config });
    const paceAfter = result.player.attributes.find(
      (a) => a.key === 'pace',
    )!.value;
    expect(paceAfter).toBe(60);
  });

  it('grants modest late-career mental growth', () => {
    const player = makePlayer({ potentialAbility: 90 }, 70);
    const visionBefore = player.attributes.find(
      (a) => a.key === 'vision',
    )!.value;
    const result = applySeasonalAging({ player, age: 28, config });
    const visionAfter = result.player.attributes.find(
      (a) => a.key === 'vision',
    )!.value;
    expect(visionAfter).toBeGreaterThan(visionBefore);
  });

  it('keeps currentAbility consistent with its attributes', () => {
    const player = makePlayer({ potentialAbility: 90 }, 78);
    const result = applySeasonalAging({ player, age: 33, config });
    expect(result.player.currentAbility).toBeCloseTo(
      visibleMean(result.player),
    );
  });
});
