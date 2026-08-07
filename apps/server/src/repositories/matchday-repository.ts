import type {
  MatchPlayer,
  StandingRow,
} from '@football-life/simulation-engine';

export interface MatchdayFixture {
  id: string;
  homeClubId: string;
  awayClubId: string;
}

/** Everything needed to simulate one round (matchday) of a season. */
export interface MatchdayRoundData {
  seasonId: string;
  competitionName: string;
  seed: string;
  fixtures: MatchdayFixture[];
  squads: Map<string, MatchPlayer[]>;
  clubNames: Map<string, string>;
  playerNames: Map<string, string>;
  standings: StandingRow[];
  protagonistClubId: string | null;
  protagonistPlayerId: string | null;
  remainingAfterThisRound: number;
}

export interface FixtureResultPersistence {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  simulationData: unknown;
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

export interface MatchdayResultsPersistence {
  seasonId: string;
  fixtures: FixtureResultPersistence[];
  appearances: AppearancePersistence[];
  standings: StandingRow[];
  completeSeason: boolean;
  /**
   * Per-player state after the round, for everyone in the protagonist's
   * league: form, and the legs. Both move for the whole division, not only
   * for the protagonist — otherwise he is the only tired man on the pitch.
   */
  playerUpdates: {
    playerId: string;
    form: number;
    fatigue: number;
    condition: number;
  }[];
}

export interface MatchdayRepository {
  /** Distinct dates (ascending) in (from, to] on which ANY club in the save has a scheduled fixture. */
  findDueMatchdayDates(
    saveGameId: string,
    from: Date,
    to: Date,
  ): Promise<Date[]>;
  /**
   * Every season's round scheduled on `date` — the whole world's matchday, not
   * just the protagonist's league. One entry per league that plays that day.
   */
  loadAllMatchdayRounds(
    saveGameId: string,
    date: Date,
  ): Promise<MatchdayRoundData[]>;
  persistMatchdayResults(data: MatchdayResultsPersistence): Promise<void>;
}
