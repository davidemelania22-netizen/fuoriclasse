import type { AttributeValue } from '@football-life/simulation-engine';

export interface ProtagonistSnapshot {
  saveGameId: string;
  playerId: string;
  currentDate: Date;
  birthDate: Date;
  currentAbility: number;
  potentialAbility: number;
  condition: number;
  fatigue: number;
  morale: number;
  motivation: number;
  attributes: AttributeValue[];
  /** Training context from the player's club, or null when unattached. */
  club: {
    trainingQuality: number;
    staffQuality: number;
    medicalQuality: number;
  } | null;
}

export interface WeeklyUpdate {
  saveGameId: string;
  playerId: string;
  newCurrentDate: Date;
  currentAbility: number;
  condition: number;
  fatigue: number;
  motivation: number;
  attributeValues: { key: string; value: number }[];
}

/** Persistence boundary for advancing the protagonist's weekly progression. */
export interface ProgressionRepository {
  loadProtagonist(saveGameId: string): Promise<ProtagonistSnapshot | null>;
  applyWeeklyUpdate(update: WeeklyUpdate): Promise<void>;
}
