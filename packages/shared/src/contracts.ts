import type { CareerStatus, PlayerPosition, PreferredFoot } from './enums';

/** A static, license-free country record (seeded reference data). */
export interface CountryRecord {
  id: string;
  code: string;
  name: string;
  reputation: number;
}

/** Serialized save-game header (dates as ISO strings for transport). */
export interface SaveGameSummary {
  id: string;
  name: string;
  seed: string;
  currentDate: string;
  playerPersonId: string | null;
  simulationVersion: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt: string;
}

/** Serialized snapshot of the protagonist player. */
export interface PlayerSummary {
  id: string;
  personId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  ageYears: number;
  nationalityId: string;
  primaryPosition: PlayerPosition;
  preferredFoot: PreferredFoot;
  careerStatus: CareerStatus;
  currentAbility: number;
  potentialAbility: number;
  clubId: string | null;
  clubName: string | null;
  condition: number;
  fatigue: number;
  morale: number;
  form: number;
  stress: number;
  marketValue: number;
}

/** A loaded game: its header plus the protagonist snapshot. */
export interface LoadedGame {
  save: SaveGameSummary;
  player: PlayerSummary;
}
