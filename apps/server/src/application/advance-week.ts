import {
  CareerStatus,
  InjuryStatus,
  type AttributeCategory,
  type ProgressionConfig,
  type RetirementConfig,
  type WellbeingConfig,
  TrainingIntensity,
} from '@football-life/shared';
import {
  addDays,
  applySeasonalAging,
  applyWeeklyTraining,
  calendarAge,
  clamp,
  createRandomSource,
  recoverInjuryWeek,
  rollInjury,
  seasonIndexSince,
  shouldRetire,
  updateMentalHealth,
  updateMorale,
  updateStress,
  type PlayerProgressState,
} from '@football-life/simulation-engine';
import { GAME_START_DATE } from '../config';
import type {
  InjuryToCreate,
  ProgressionRepository,
} from '../repositories/progression-repository';

const FALLBACK_INJURY_TYPES = ['strain', 'sprain', 'knock'];

export interface AdvanceWeeksDeps {
  repository: ProgressionRepository;
  config: ProgressionConfig;
  wellbeingConfig: WellbeingConfig;
  retirementConfig?: RetirementConfig;
  injuryTypeKeys?: readonly string[];
  difficultyModifier?: number;
}

export interface AdvanceWeeksInput {
  saveGameId: string;
  weeks?: number | undefined;
  intensity?: TrainingIntensity | undefined;
  focus?: AttributeCategory | null | undefined;
  usefulMinutes?: number | undefined;
}

export interface WeeklyAdvanceReport {
  weeksAdvanced: number;
  seasonsCrossed: number;
  ageBefore: number;
  ageAfter: number;
  abilityBefore: number;
  abilityAfter: number;
  fatigue: number;
  condition: number;
  morale: number;
  stress: number;
  injured: boolean;
  injuriesSustained: number;
  retired: boolean;
  newCurrentDate: string;
}

interface TrackedInjury {
  weeksRemaining: number;
  /** Set when the injury pre-existed in the database. */
  existingId: string | null;
  /** Set when the injury was created during this advance. */
  record: InjuryToCreate | null;
}

export async function advanceWeeks(
  deps: AdvanceWeeksDeps,
  input: AdvanceWeeksInput,
): Promise<WeeklyAdvanceReport | null> {
  const snapshot = await deps.repository.loadProtagonist(input.saveGameId);
  if (!snapshot) {
    return null;
  }

  const weeks = Math.max(1, input.weeks ?? 1);
  const intensity = input.intensity ?? TrainingIntensity.Normal;
  const focus = input.focus ?? null;
  const usefulMinutes = input.usefulMinutes ?? 0;
  const difficultyModifier = deps.difficultyModifier ?? 1;
  const injuryTypeKeys =
    deps.injuryTypeKeys && deps.injuryTypeKeys.length > 0
      ? deps.injuryTypeKeys
      : FALLBACK_INJURY_TYPES;
  const club = snapshot.club ?? {
    trainingQuality: deps.config.defaultClubQuality.training,
    staffQuality: deps.config.defaultClubQuality.staff,
    medicalQuality: deps.config.defaultClubQuality.medical,
  };

  const initialValues = new Map(
    snapshot.attributes.map((attribute) => [attribute.key, attribute.value]),
  );
  const ageBefore = calendarAge(snapshot.birthDate, snapshot.currentDate);
  const rng = createRandomSource(
    `${snapshot.seed}:wellbeing:${snapshot.playerId}:${snapshot.currentDate.toISOString()}`,
  );

  let player: PlayerProgressState = {
    currentAbility: snapshot.currentAbility,
    potentialAbility: snapshot.potentialAbility,
    attributes: snapshot.attributes,
    condition: snapshot.condition,
    fatigue: snapshot.fatigue,
    morale: snapshot.morale,
    motivation: snapshot.motivation,
  };
  let stress = snapshot.stress;
  let mentalHealth = snapshot.mentalHealth;
  let currentDate = snapshot.currentDate;
  let seasonsCrossed = 0;
  let weeksDone = 0;
  let retired = false;

  let injury: TrackedInjury | null = snapshot.activeInjury
    ? {
        weeksRemaining: snapshot.activeInjury.weeksRemaining,
        existingId: snapshot.activeInjury.id,
        record: null,
      }
    : null;
  const injuriesToCreate: InjuryToCreate[] = [];
  const healedInjuryIds: { id: string; actualEndAt: Date }[] = [];

  for (let week = 0; week < weeks; week += 1) {
    const age = calendarAge(snapshot.birthDate, currentDate);

    if (injury) {
      const step = recoverInjuryWeek(injury.weeksRemaining);
      injury.weeksRemaining = step.weeksRemaining;
      // An injured player rests: fatigue recedes, no training growth.
      player = {
        ...player,
        fatigue: clamp(player.fatigue - 8, 0, 100),
      };
      player.condition = clamp(100 - 0.9 * player.fatigue, 10, 100);
      if (step.healed) {
        if (injury.existingId) {
          healedInjuryIds.push({
            id: injury.existingId,
            actualEndAt: currentDate,
          });
        } else if (injury.record) {
          injury.record.status = InjuryStatus.Healed;
          injury.record.actualEndAt = currentDate;
        }
        injury = null;
      }
    } else {
      player = applyWeeklyTraining({
        player,
        age,
        club,
        intensity,
        focus,
        usefulMinutes,
        difficultyModifier,
        config: deps.config,
      }).player;

      const roll = rollInjury(
        {
          injuryProneness: snapshot.injuryProneness,
          fatigue: player.fatigue,
          recentLoad: player.fatigue,
          age,
          injuryHistoryCount:
            snapshot.injuryHistoryCount + injuriesToCreate.length,
          intensity,
          medicalQuality: club.medicalQuality,
        },
        injuryTypeKeys,
        deps.wellbeingConfig,
        rng,
      );
      if (roll) {
        const record: InjuryToCreate = {
          typeKey: roll.typeKey,
          startedAt: currentDate,
          expectedEndAt: addDays(currentDate, roll.durationWeeks * 7),
          actualEndAt: null,
          severity: roll.severity,
          recurrenceRisk: roll.recurrenceRisk,
          status: InjuryStatus.Active,
        };
        injuriesToCreate.push(record);
        injury = {
          weeksRemaining: roll.durationWeeks,
          existingId: null,
          record,
        };
      }
    }

    const isInjured = injury !== null;
    player.morale = updateMorale(
      { morale: player.morale, injured: isInjured, stress },
      deps.wellbeingConfig,
    );
    stress = updateStress(
      { stress, injured: isInjured, intensity },
      deps.wellbeingConfig,
    );
    mentalHealth = updateMentalHealth(
      mentalHealth,
      stress,
      deps.wellbeingConfig,
    );

    const seasonBefore = seasonIndexSince(GAME_START_DATE, currentDate);
    currentDate = addDays(currentDate, 7);
    const seasonAfter = seasonIndexSince(GAME_START_DATE, currentDate);
    if (seasonAfter > seasonBefore) {
      seasonsCrossed += seasonAfter - seasonBefore;
      const newAge = calendarAge(snapshot.birthDate, currentDate);
      player = applySeasonalAging({
        player,
        age: newAge,
        config: deps.config,
      }).player;
      if (
        deps.retirementConfig &&
        shouldRetire({
          age: newAge,
          currentAbility: player.currentAbility,
          peakAbility: snapshot.potentialAbility,
          config: deps.retirementConfig,
          rng,
        })
      ) {
        retired = true;
      }
    }

    weeksDone += 1;
    if (retired) break;
  }

  const attributeValues = player.attributes
    .filter((attribute) => initialValues.get(attribute.key) !== attribute.value)
    .map((attribute) => ({ key: attribute.key, value: attribute.value }));

  const careerStatus = retired
    ? CareerStatus.Retired
    : injury
      ? CareerStatus.Injured
      : snapshot.careerStatus === CareerStatus.Injured
        ? CareerStatus.Active
        : snapshot.careerStatus;

  await deps.repository.applyWeeklyUpdate({
    saveGameId: snapshot.saveGameId,
    playerId: snapshot.playerId,
    newCurrentDate: currentDate,
    currentAbility: player.currentAbility,
    condition: player.condition,
    fatigue: player.fatigue,
    motivation: player.motivation,
    morale: player.morale,
    stress,
    mentalHealth,
    careerStatus,
    attributeValues,
    injuriesToCreate,
    healedInjuryIds,
    retired,
    retirementDate: retired ? currentDate : null,
  });

  return {
    weeksAdvanced: weeksDone,
    seasonsCrossed,
    ageBefore,
    ageAfter: calendarAge(snapshot.birthDate, currentDate),
    abilityBefore: snapshot.currentAbility,
    abilityAfter: player.currentAbility,
    fatigue: player.fatigue,
    condition: player.condition,
    morale: player.morale,
    stress,
    injured: injury !== null,
    injuriesSustained: injuriesToCreate.length,
    retired,
    newCurrentDate: currentDate.toISOString(),
  };
}
