import {
  ATTRIBUTE_DEFINITIONS,
  AttributeCategory,
  CareerStatus,
  PersonType,
  type LoadedGame,
  type NewGameInput,
} from '@football-life/shared';
import { quickStartOf } from '@football-life/game-data';
import {
  DEFAULT_SEED,
  GAME_START_DATE,
  SIMULATION_VERSION,
  STARTING_BALANCE,
} from '../config';
import type {
  NewGamePersistenceInput,
  SaveGameRepository,
} from '../repositories/save-game-repository';

// Deterministic baselines for the protagonist: the visible baseline, age,
// potential, reputation and market value come from the chosen quick-start
// (CLASSIC reproduces the historical defaults). Hidden traits stay neutral.
const HIDDEN_BASELINE = 50;

export interface CreateNewGameDeps {
  repository: SaveGameRepository;
  now?: () => Date;
}

export async function createNewGame(
  deps: CreateNewGameDeps,
  input: NewGameInput,
): Promise<LoadedGame> {
  const now = (deps.now ?? (() => new Date()))();
  const currentDate = GAME_START_DATE;
  const quickStart = quickStartOf(input.quickStart);
  const birthDate = new Date(
    Date.UTC(
      currentDate.getUTCFullYear() - quickStart.ageYears,
      currentDate.getUTCMonth(),
      currentDate.getUTCDate(),
    ),
  );

  const attributes = ATTRIBUTE_DEFINITIONS.map((definition) => ({
    attributeKey: definition.key,
    value:
      definition.category === AttributeCategory.Hidden
        ? HIDDEN_BASELINE
        : quickStart.visibleBaseline,
    category: definition.category,
  }));

  const visible = attributes.filter(
    (attribute) => attribute.category !== AttributeCategory.Hidden,
  );
  const currentAbility =
    visible.reduce((sum, attribute) => sum + attribute.value, 0) /
    visible.length;

  const persistence: NewGamePersistenceInput = {
    save: {
      name: input.name,
      seed: input.seed ?? DEFAULT_SEED,
      currentDate,
      simulationVersion: SIMULATION_VERSION,
      lastPlayedAt: now,
    },
    person: {
      firstName: input.player.firstName,
      lastName: input.player.lastName,
      birthDate,
      nationalityId: input.player.nationalityId,
      personType: PersonType.Player,
      personalityProfile: {},
    },
    player: {
      primaryPosition: input.player.primaryPosition,
      secondaryPositions: [],
      preferredFoot: input.player.preferredFoot,
      heightCm: 170,
      weightKg: 62,
      currentAbility,
      potentialAbility: quickStart.potential,
      reputation: quickStart.reputation,
      popularity: 20,
      marketValue: quickStart.marketValue,
      condition: 100,
      fatigue: 0,
      morale: 60,
      form: 50,
      confidence: 50,
      motivation: 70,
      stress: 20,
      happiness: 60,
      mentalHealth: 80,
      careerStatus: CareerStatus.Youth,
    },
    attributes,
    startingBalance: STARTING_BALANCE,
  };

  return deps.repository.persistNewGame(persistence);
}
