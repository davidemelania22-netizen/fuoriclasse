import {
  ATTRIBUTE_DEFINITIONS,
  AttributeCategory,
  CareerStatus,
  PersonType,
  type LoadedGame,
  type NewGameInput,
} from '@football-life/shared';
import {
  DEFAULT_SEED,
  GAME_START_DATE,
  SIMULATION_VERSION,
  STARTING_AGE_YEARS,
} from '../config';
import type {
  NewGamePersistenceInput,
  SaveGameRepository,
} from '../repositories/save-game-repository';

// Deterministic baselines for the protagonist. Procedural generation of varied
// talent and attributes is introduced in Milestone 3; here we persist a sound,
// reproducible starting point so create/reload can be validated.
const VISIBLE_BASELINE = 25;
const HIDDEN_BASELINE = 50;
const STARTING_POTENTIAL = 65;

function baselineFor(category: AttributeCategory): number {
  return category === AttributeCategory.Hidden
    ? HIDDEN_BASELINE
    : VISIBLE_BASELINE;
}

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
  const birthDate = new Date(
    Date.UTC(
      currentDate.getUTCFullYear() - STARTING_AGE_YEARS,
      currentDate.getUTCMonth(),
      currentDate.getUTCDate(),
    ),
  );

  const attributes = ATTRIBUTE_DEFINITIONS.map((definition) => ({
    attributeKey: definition.key,
    value: baselineFor(definition.category),
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
      potentialAbility: STARTING_POTENTIAL,
      reputation: 100,
      popularity: 20,
      marketValue: 50_000,
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
  };

  return deps.repository.persistNewGame(persistence);
}
