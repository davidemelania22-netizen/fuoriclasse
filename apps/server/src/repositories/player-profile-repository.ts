/** One attribute as stored: 1..100 on the server scale. */
export interface ProfileAttributeRecord {
  key: string;
  category: string;
  value: number;
}

/** The most recent outings, newest last — the form bars read left to right. */
export interface ProfileRecentMatch {
  date: string;
  opponentName: string;
  competitionName: string | null;
  rating: number;
  goals: number;
  assists: number;
}

export interface ProfileSeasonLine {
  competitionName: string;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating: number;
}

export interface ProfileContract {
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  weeklyWage: number;
  endDate: string;
  squadRole: string;
}

export interface PlayerProfileData {
  playerId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  ageYears: number;
  nationalityId: string;
  primaryPosition: string;
  secondaryPositions: string[];
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
  stress: number;
  careerStatus: string;
  attributes: ProfileAttributeRecord[];
  contract: ProfileContract | null;
  /** Current season only, one row per competition. */
  seasonLabel: string | null;
  seasonLines: ProfileSeasonLine[];
  recentMatches: ProfileRecentMatch[];
  careerTotals: {
    appearances: number;
    goals: number;
    assists: number;
    clubs: number;
  };
}

export interface PlayerProfileRepository {
  loadPlayerProfile(saveGameId: string): Promise<PlayerProfileData | null>;
}
