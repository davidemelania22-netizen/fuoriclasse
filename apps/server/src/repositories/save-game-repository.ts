import type { LoadedGame, SaveGameSummary } from '@football-life/shared';

export interface PersistedSaveInput {
  name: string;
  seed: string;
  currentDate: Date;
  simulationVersion: string;
  lastPlayedAt: Date;
}

export interface PersistedPersonInput {
  firstName: string;
  lastName: string;
  birthDate: Date;
  nationalityId: string;
  secondaryNationalityId?: string | null;
  personType: string;
  personalityProfile: unknown;
}

export interface PersistedPlayerInput {
  primaryPosition: string;
  secondaryPositions: unknown;
  preferredFoot: string;
  heightCm: number;
  weightKg: number;
  currentAbility: number;
  potentialAbility: number;
  reputation: number;
  popularity: number;
  marketValue: number;
  condition: number;
  fatigue: number;
  morale: number;
  form: number;
  confidence: number;
  motivation: number;
  stress: number;
  happiness: number;
  mentalHealth: number;
  careerStatus: string;
}

export interface PersistedAttributeInput {
  attributeKey: string;
  value: number;
  category: string;
}

export interface NewGamePersistenceInput {
  save: PersistedSaveInput;
  person: PersistedPersonInput;
  player: PersistedPlayerInput;
  attributes: readonly PersistedAttributeInput[];
}

/**
 * Persistence boundary for save games. The application layer builds fully
 * specified payloads; the implementation handles transactions and mapping.
 */
export interface SaveGameRepository {
  persistNewGame(input: NewGamePersistenceInput): Promise<LoadedGame>;
  loadGame(saveGameId: string): Promise<LoadedGame | null>;
  listSaves(): Promise<SaveGameSummary[]>;
  deleteSave(saveGameId: string): Promise<void>;
}
