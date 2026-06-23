import type { PlayerPosition } from '@football-life/shared';

export interface MatchPlayer {
  id: string;
  position: PlayerPosition;
  currentAbility: number;
  form: number;
  condition: number;
  morale: number;
  discipline: number;
  finishing: number;
}

export interface MatchTeamInput {
  clubId: string;
  players: readonly MatchPlayer[];
}

export interface MatchAppearanceResult {
  playerId: string;
  clubId: string;
  started: boolean;
  minutesPlayed: number;
  position: PlayerPosition;
  rating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export type MatchEventType = 'GOAL' | 'YELLOW_CARD' | 'RED_CARD';

export interface MatchEvent {
  type: MatchEventType;
  clubId: string;
  playerId: string;
  assistPlayerId?: string;
}

export interface MatchResult {
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  appearances: MatchAppearanceResult[];
  events: MatchEvent[];
  commentary: string[];
}

export interface TeamStrength {
  attack: number;
  midfield: number;
  defense: number;
  attackingPower: number;
  defensivePower: number;
}
