import type { AttributeCategory } from '@football-life/shared';

export interface AttributeValue {
  key: string;
  value: number;
  category: AttributeCategory;
}

/** The subset of player state mutated by the weekly progression systems. */
export interface PlayerProgressState {
  currentAbility: number;
  potentialAbility: number;
  attributes: AttributeValue[];
  condition: number;
  fatigue: number;
  morale: number;
  motivation: number;
}

export interface ClubTrainingContext {
  trainingQuality: number;
  staffQuality: number;
  medicalQuality: number;
}

export interface AttributeChange {
  key: string;
  before: number;
  after: number;
}
