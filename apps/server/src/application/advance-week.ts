import {
  type AttributeCategory,
  type ProgressionConfig,
  TrainingIntensity,
} from '@football-life/shared';
import {
  addDays,
  applySeasonalAging,
  applyWeeklyTraining,
  calendarAge,
  seasonIndexSince,
  type PlayerProgressState,
} from '@football-life/simulation-engine';
import { GAME_START_DATE } from '../config';
import type { ProgressionRepository } from '../repositories/progression-repository';

export interface AdvanceWeeksDeps {
  repository: ProgressionRepository;
  config: ProgressionConfig;
  difficultyModifier?: number;
}

export interface AdvanceWeeksInput {
  saveGameId: string;
  weeks?: number;
  intensity?: TrainingIntensity;
  focus?: AttributeCategory | null;
  usefulMinutes?: number;
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
  newCurrentDate: string;
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
  const club = snapshot.club ?? {
    trainingQuality: deps.config.defaultClubQuality.training,
    staffQuality: deps.config.defaultClubQuality.staff,
    medicalQuality: deps.config.defaultClubQuality.medical,
  };

  const initialValues = new Map(
    snapshot.attributes.map((attribute) => [attribute.key, attribute.value]),
  );
  const ageBefore = calendarAge(snapshot.birthDate, snapshot.currentDate);

  let player: PlayerProgressState = {
    currentAbility: snapshot.currentAbility,
    potentialAbility: snapshot.potentialAbility,
    attributes: snapshot.attributes,
    condition: snapshot.condition,
    fatigue: snapshot.fatigue,
    morale: snapshot.morale,
    motivation: snapshot.motivation,
  };
  let currentDate = snapshot.currentDate;
  let seasonsCrossed = 0;

  for (let week = 0; week < weeks; week += 1) {
    const age = calendarAge(snapshot.birthDate, currentDate);
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

    const seasonBefore = seasonIndexSince(GAME_START_DATE, currentDate);
    currentDate = addDays(currentDate, 7);
    const seasonAfter = seasonIndexSince(GAME_START_DATE, currentDate);
    if (seasonAfter > seasonBefore) {
      seasonsCrossed += seasonAfter - seasonBefore;
      player = applySeasonalAging({
        player,
        age: calendarAge(snapshot.birthDate, currentDate),
        config: deps.config,
      }).player;
    }
  }

  const attributeValues = player.attributes
    .filter((attribute) => initialValues.get(attribute.key) !== attribute.value)
    .map((attribute) => ({ key: attribute.key, value: attribute.value }));

  await deps.repository.applyWeeklyUpdate({
    saveGameId: snapshot.saveGameId,
    playerId: snapshot.playerId,
    newCurrentDate: currentDate,
    currentAbility: player.currentAbility,
    condition: player.condition,
    fatigue: player.fatigue,
    motivation: player.motivation,
    attributeValues,
  });

  return {
    weeksAdvanced: weeks,
    seasonsCrossed,
    ageBefore,
    ageAfter: calendarAge(snapshot.birthDate, currentDate),
    abilityBefore: snapshot.currentAbility,
    abilityAfter: player.currentAbility,
    fatigue: player.fatigue,
    condition: player.condition,
    newCurrentDate: currentDate.toISOString(),
  };
}
