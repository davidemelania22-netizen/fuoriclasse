/** One protagonist appearance enriched with its season, for career stats. */
export interface CareerAppearanceRow {
  seasonId: string;
  seasonLabel: string;
  seasonStartMs: number;
  competitionName: string;
  clubId: string;
  clubName: string;
  minutesPlayed: number;
  rating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface CareerHonourRow {
  type: string;
  competitionName: string | null;
  seasonLabel: string;
  /** True when the honour names the protagonist directly (individual award). */
  isPersonal: boolean;
}

export interface CareerStatsData {
  firstName: string;
  lastName: string;
  age: number;
  careerStatus: string;
  currentAbility: number;
  appearances: CareerAppearanceRow[];
  honours: CareerHonourRow[];
}

export interface CareerStatsRepository {
  loadCareerStats(saveGameId: string): Promise<CareerStatsData | null>;
}
