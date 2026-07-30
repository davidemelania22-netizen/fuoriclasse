import type { StandingRow } from '@football-life/simulation-engine';

export interface LeagueStandingsData {
  competitionId: string;
  competitionName: string;
  countryId: string | null;
  tier: number;
  seasonLabel: string;
  competitionLogo: string | null;
  clubNames: Map<string, string>;
  clubLogos: Map<string, string | null>;
  rows: StandingRow[];
}

export interface StandingsData {
  protagonistClubId: string | null;
  leagues: LeagueStandingsData[];
}

export interface StandingsRepository {
  loadStandings(saveGameId: string): Promise<StandingsData | null>;
}
