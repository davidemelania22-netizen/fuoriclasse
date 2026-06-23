import type {
  MatchPlayer,
  StandingRow,
} from '@football-life/simulation-engine';

export interface SeasonSimData {
  seasonId: string;
  seed: string;
  fixtures: { id: string; homeClubId: string; awayClubId: string }[];
  squads: Map<string, MatchPlayer[]>;
}

export interface FixtureResultPersistence {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
}

export interface AppearancePersistence {
  fixtureId: string;
  playerId: string;
  clubId: string;
  started: boolean;
  minutesPlayed: number;
  position: string;
  rating: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface SeasonResultsPersistence {
  seasonId: string;
  fixtures: FixtureResultPersistence[];
  appearances: AppearancePersistence[];
  standings: StandingRow[];
}

/** Persistence boundary for simulating and storing a full season. */
export interface SeasonRepository {
  loadSeasonForSimulation(seasonId: string): Promise<SeasonSimData | null>;
  persistSeasonResults(data: SeasonResultsPersistence): Promise<void>;
}
