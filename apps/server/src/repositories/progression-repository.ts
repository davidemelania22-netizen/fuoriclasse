import type { AttributeValue } from '@football-life/simulation-engine';

export interface ActiveInjurySnapshot {
  id: string;
  typeKey: string;
  weeksRemaining: number;
  severity: number;
  recurrenceRisk: number;
  treatmentChoice: string | null;
}

export interface RecentlyHealedInjurySnapshot {
  typeKey: string;
  actualEndAt: Date;
  recurrenceRisk: number;
}

export interface ProtagonistSnapshot {
  saveGameId: string;
  seed: string;
  playerId: string;
  currentDate: Date;
  birthDate: Date;
  currentAbility: number;
  potentialAbility: number;
  condition: number;
  fatigue: number;
  morale: number;
  motivation: number;
  stress: number;
  mentalHealth: number;
  careerStatus: string;
  injuryProneness: number;
  injuryHistoryCount: number;
  /** Minutes played recently — match fitness that boosts training growth. */
  recentMinutes: number;
  activeInjury: ActiveInjurySnapshot | null;
  recentlyHealedInjury: RecentlyHealedInjurySnapshot | null;
  attributes: AttributeValue[];
  /** Training context from the player's club, or null when unattached. */
  club: {
    trainingQuality: number;
    staffQuality: number;
    medicalQuality: number;
  } | null;
}

export interface InjuryToCreate {
  typeKey: string;
  startedAt: Date;
  expectedEndAt: Date;
  actualEndAt: Date | null;
  severity: number;
  recurrenceRisk: number;
  status: string;
}

export interface WeeklyUpdate {
  saveGameId: string;
  playerId: string;
  newCurrentDate: Date;
  currentAbility: number;
  condition: number;
  fatigue: number;
  motivation: number;
  morale: number;
  stress: number;
  mentalHealth: number;
  careerStatus: string;
  attributeValues: { key: string; value: number }[];
  injuriesToCreate: InjuryToCreate[];
  healedInjuryIds: { id: string; actualEndAt: Date }[];
  retired: boolean;
  retirementDate: Date | null;
}

export interface InjuryTreatmentUpdate {
  injuryId: string;
  treatmentChoice: string;
  expectedEndAt: Date;
  recurrenceRisk: number;
}

/** What a matchday adds to the protagonist once the results are known. */
export interface MatchAftermathUpdate {
  saveGameId: string;
  fatigueDelta: number;
  moraleDelta: number;
}

/** Persistence boundary for advancing the protagonist's weekly progression. */
export interface ProgressionRepository {
  loadProtagonist(saveGameId: string): Promise<ProtagonistSnapshot | null>;
  applyWeeklyUpdate(update: WeeklyUpdate): Promise<void>;
  applyInjuryTreatment(update: InjuryTreatmentUpdate): Promise<void>;
  /**
   * Applied after the matches are played, because training runs before them:
   * the ninety minutes and the result cannot be known when the week starts.
   */
  applyMatchAftermath(
    update: MatchAftermathUpdate,
  ): Promise<{ fatigue: number; condition: number; morale: number } | null>;
}
