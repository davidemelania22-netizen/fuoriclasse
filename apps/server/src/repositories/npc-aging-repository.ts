import type { GeneratedPlayer } from '@football-life/simulation-engine';

export interface AgingPlayer {
  id: string;
  clubId: string;
  /** The club's country, used for a retiree's replacement youth. */
  countryId: string;
  clubStrength: number;
  birthDate: Date;
  currentAbility: number;
  potentialAbility: number;
  primaryPosition: string;
}

export interface NpcAgingState {
  saveGameId: string;
  seed: string;
  currentDate: Date;
  players: AgingPlayer[];
}

export interface NewYouth {
  clubId: string;
  player: GeneratedPlayer;
}

export interface NpcAgingPersistence {
  /** playerId -> new currentAbility, for players whose ability changed. */
  abilityUpdates: { playerId: string; currentAbility: number }[];
  retiredPlayerIds: string[];
  youth: NewYouth[];
}

export interface NpcAgingRepository {
  /** All active non-protagonist players, or null when the save has no player. */
  loadAgingState(saveGameId: string): Promise<NpcAgingState | null>;
  persistAging(saveGameId: string, data: NpcAgingPersistence): Promise<void>;
}
