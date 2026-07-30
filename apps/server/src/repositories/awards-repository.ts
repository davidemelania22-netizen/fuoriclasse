import type { RecordHonourInput } from './cup-repository';

export interface CompletedLeagueSeason {
  seasonId: string;
  seasonLabel: string;
  competitionId: string;
  competitionName: string;
  /** Reputation of this league, and of the strongest one in the world. */
  competitionReputation: number;
  topLeagueReputation: number;
}

export interface SeasonPlayerStat {
  playerId: string;
  playerName: string;
  clubName: string;
  goals: number;
  assists: number;
  averageRating: number;
}

export interface ExistingSeasonAward {
  playerName: string;
  clubName: string;
  goals: number;
  assists: number;
  averageRating: number;
}

export interface AwardsRepository {
  /** The protagonist's own league's most recently COMPLETED season, if any. */
  loadLastCompletedLeagueSeason(
    saveGameId: string,
  ): Promise<CompletedLeagueSeason | null>;
  aggregateSeasonStats(seasonId: string): Promise<SeasonPlayerStat[]>;
  findExistingAward(
    saveGameId: string,
    competitionId: string,
    seasonLabel: string,
    type: 'GOLDEN_BOOT' | 'BALLON_DOR',
  ): Promise<ExistingSeasonAward | null>;
  recordHonour(input: RecordHonourInput): Promise<void>;
}
