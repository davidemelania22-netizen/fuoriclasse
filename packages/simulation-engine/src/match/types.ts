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
  /**
   * Whether the player can be fielded. Injured or retired players stay in the
   * squad (so they still drift in form while idle) but are never selected.
   * Undefined is treated as available for backwards compatibility.
   */
  available?: boolean;
  /**
   * Additive nudge to the selection score from manager preference (e.g. the
   * protagonist's manager trust). Undefined/0 is neutral.
   */
  selectionBias?: number;
  /**
   * Personal tactical instructions (see match/instructions.ts): multipliers on
   * how often this player ends up scoring, assisting or getting booked.
   * Undefined = 1 (neutral).
   */
  goalBias?: number;
  assistBias?: number;
  cardBias?: number;
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
  minute: number;
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
