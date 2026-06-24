import {
  ATTRIBUTE_DEFINITIONS,
  AttributeCategory,
  TrainingIntensity,
  type CareerConfig,
  type ProgressionConfig,
  type RetirementConfig,
  type WellbeingConfig,
} from '@football-life/shared';
import { createRandomSource } from '../random/seeded-random';
import { clamp } from '../util/math';
import { applyWeeklyTraining } from '../progression/training-system';
import { applySeasonalAging } from '../progression/aging-system';
import type { PlayerProgressState } from '../progression/types';
import { recoverInjuryWeek, rollInjury } from '../wellbeing/injury-system';
import { updateMorale, updateStress } from '../wellbeing/morale-system';
import { computeMarketValue } from './market-value';
import { computeLegacyScore, shouldRetire } from './retirement';

const WEEKS_PER_YEAR = 52;

export interface SimulateCareerInput {
  seed: string;
  progressionConfig: ProgressionConfig;
  wellbeingConfig: WellbeingConfig;
  careerConfig: CareerConfig;
  retirementConfig: RetirementConfig;
  injuryTypeKeys: readonly string[];
  startAge?: number;
  initialAbility?: number;
  potentialAbility?: number;
  intensity?: TrainingIntensity;
}

export interface CareerOutcome {
  seed: string;
  potentialAbility: number;
  peakAbility: number;
  peakAge: number;
  finalAbility: number;
  retirementAge: number;
  careerYears: number;
  totalInjuries: number;
  peakMarketValue: number;
  legacyScore: number;
}

/**
 * Run a full career (start age to retirement) entirely in-engine, composing the
 * training, aging, injury, morale/stress and retirement systems. Deterministic
 * per seed; no I/O.
 */
export function simulateCareer(input: SimulateCareerInput): CareerOutcome {
  const rng = createRandomSource(input.seed);
  const startAge = input.startAge ?? 14;
  const intensity = input.intensity ?? TrainingIntensity.Normal;
  const initialAbility = input.initialAbility ?? 25;
  const potentialAbility =
    input.potentialAbility ??
    clamp(Math.round(rng.normal(62, 12)), initialAbility + 5, 95);

  const club = {
    trainingQuality: input.progressionConfig.defaultClubQuality.training,
    staffQuality: input.progressionConfig.defaultClubQuality.staff,
    medicalQuality: input.progressionConfig.defaultClubQuality.medical,
  };

  let player: PlayerProgressState = {
    currentAbility: initialAbility,
    potentialAbility,
    attributes: ATTRIBUTE_DEFINITIONS.map((definition) => ({
      key: definition.key,
      category: definition.category,
      value:
        definition.category === AttributeCategory.Hidden ? 50 : initialAbility,
    })),
    condition: 100,
    fatigue: 0,
    morale: 65,
    motivation: 75,
  };
  const injuryProneness =
    player.attributes.find((a) => a.key === 'injuryProneness')?.value ?? 50;

  let stress = 20;
  let injuryWeeksRemaining = 0;
  let totalInjuries = 0;
  let peakAbility = player.currentAbility;
  let peakAge = startAge;
  let peakMarketValue = 0;
  let age = startAge;
  let week = 0;
  let retirementAge = input.retirementConfig.forcedRetirementAge;

  while (age < input.retirementConfig.forcedRetirementAge) {
    if (injuryWeeksRemaining > 0) {
      const step = recoverInjuryWeek(injuryWeeksRemaining);
      injuryWeeksRemaining = step.weeksRemaining;
      player = { ...player, fatigue: clamp(player.fatigue - 8, 0, 100) };
    } else {
      player = applyWeeklyTraining({
        player,
        age,
        club,
        intensity,
        usefulMinutes: 0,
        difficultyModifier: 1,
        config: input.progressionConfig,
      }).player;

      const roll = rollInjury(
        {
          injuryProneness,
          fatigue: player.fatigue,
          recentLoad: player.fatigue,
          age,
          injuryHistoryCount: totalInjuries,
          intensity,
          medicalQuality: club.medicalQuality,
        },
        input.injuryTypeKeys,
        input.wellbeingConfig,
        rng,
      );
      if (roll) {
        injuryWeeksRemaining = roll.durationWeeks;
        totalInjuries += 1;
      }
    }

    const injured = injuryWeeksRemaining > 0;
    stress = updateStress(
      { stress, injured, intensity },
      input.wellbeingConfig,
    );
    player.morale = updateMorale(
      { morale: player.morale, injured, stress },
      input.wellbeingConfig,
    );

    if (player.currentAbility > peakAbility) {
      peakAbility = player.currentAbility;
      peakAge = age;
    }

    week += 1;
    if (week % WEEKS_PER_YEAR === 0) {
      age += 1;
      player = applySeasonalAging({
        player,
        age,
        config: input.progressionConfig,
      }).player;

      const marketValue = computeMarketValue(
        {
          currentAbility: player.currentAbility,
          potentialAbility,
          age,
          form: 50,
          reputation: clamp(player.currentAbility * 40, 0, 5000),
          contractYearsRemaining: 2,
          leagueReputation: 3000,
        },
        input.careerConfig,
      );
      peakMarketValue = Math.max(peakMarketValue, marketValue);

      if (
        shouldRetire({
          age,
          currentAbility: player.currentAbility,
          peakAbility,
          config: input.retirementConfig,
          rng,
        })
      ) {
        retirementAge = age;
        break;
      }
    }
  }

  const careerYears = retirementAge - startAge;
  return {
    seed: input.seed,
    potentialAbility,
    peakAbility: Math.round(peakAbility),
    peakAge,
    finalAbility: Math.round(player.currentAbility),
    retirementAge,
    careerYears,
    totalInjuries,
    peakMarketValue,
    legacyScore: computeLegacyScore({
      peakAbility,
      careerYears,
      peakMarketValue,
    }),
  };
}
