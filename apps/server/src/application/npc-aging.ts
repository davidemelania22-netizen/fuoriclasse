import type {
  ProgressionConfig,
  RetirementConfig,
  WorldGenerationConfig,
  PlayerPosition,
} from '@football-life/shared';
import {
  calendarAge,
  createRandomSource,
  generatePlayer,
  projectNpcSeasonAbility,
  shouldRetire,
} from '@football-life/simulation-engine';
import type {
  NewYouth,
  NpcAgingRepository,
} from '../repositories/npc-aging-repository';

export interface NpcAgingDeps {
  repository: NpcAgingRepository;
  progressionConfig: ProgressionConfig;
  retirementConfig: RetirementConfig;
  worldConfig: WorldGenerationConfig;
}

export interface NpcAgingResult {
  agedCount: number;
  retiredCount: number;
  youthCount: number;
}

const NONE: NpcAgingResult = { agedCount: 0, retiredCount: 0, youthCount: 0 };

// Replacements enter the world as teenagers.
const YOUTH_AGE = { min: 16, max: 20, mean: 17, spread: 1 };

/**
 * Age the whole background world one season: every NPC's ability drifts toward
 * their potential (young) or declines (veteran), the oldest/faded ones retire,
 * and each retiree is replaced by a fresh academy prospect so squads stay full.
 * The protagonist is excluded — they age through the weekly loop instead.
 */
export async function ageWorldAtSeasonBoundary(
  deps: NpcAgingDeps,
  input: { saveGameId: string; seasonLabel: string },
): Promise<NpcAgingResult> {
  const state = await deps.repository.loadAgingState(input.saveGameId);
  if (!state || state.players.length === 0) return NONE;

  const rng = createRandomSource(`${state.seed}:aging:${input.seasonLabel}`);
  const youthConfig: WorldGenerationConfig = {
    ...deps.worldConfig,
    age: YOUTH_AGE,
  };

  const abilityUpdates: { playerId: string; currentAbility: number }[] = [];
  const retiredPlayerIds: string[] = [];
  const youth: NewYouth[] = [];

  for (const player of state.players) {
    const age = calendarAge(player.birthDate, state.currentDate);
    const newAbility = projectNpcSeasonAbility({
      currentAbility: player.currentAbility,
      potentialAbility: player.potentialAbility,
      age,
      config: deps.progressionConfig,
    });

    const retires = shouldRetire({
      age,
      currentAbility: newAbility,
      peakAbility: player.potentialAbility,
      config: deps.retirementConfig,
      rng,
    });

    if (retires) {
      retiredPlayerIds.push(player.id);
      const namePool = deps.worldConfig.namePools[player.countryId];
      if (namePool) {
        youth.push({
          clubId: player.clubId,
          player: generatePlayer({
            rng,
            key: `youth-${player.id}`,
            clubKey: player.clubId,
            countryId: player.countryId,
            namePool,
            position: player.primaryPosition as PlayerPosition,
            clubStrength: player.clubStrength,
            config: youthConfig,
            seasonStart: state.currentDate,
          }),
        });
      }
      continue;
    }

    if (Math.abs(newAbility - player.currentAbility) >= 0.05) {
      abilityUpdates.push({ playerId: player.id, currentAbility: newAbility });
    }
  }

  await deps.repository.persistAging(input.saveGameId, {
    abilityUpdates,
    retiredPlayerIds,
    youth,
  });

  return {
    agedCount: abilityUpdates.length,
    retiredCount: retiredPlayerIds.length,
    youthCount: youth.length,
  };
}
