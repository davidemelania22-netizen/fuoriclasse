import type { StandingRow } from '@football-life/simulation-engine';

/** One league whose season just completed, ready for the end-of-season review. */
export interface CompletedLeague {
  competitionId: string;
  competitionName: string;
  countryId: string | null;
  seasonLabel: string;
  clubs: {
    id: string;
    name: string;
    reputation: number;
    /** From Club.philosophy JSON; null when never assigned. */
    managerName: string | null;
  }[];
  standings: StandingRow[];
}

export interface SeasonReviewRepository {
  seed(saveGameId: string): Promise<string | null>;
  /** Every LEAGUE competition's most recently COMPLETED season. */
  loadCompletedLeagues(saveGameId: string): Promise<CompletedLeague[]>;
  /** Patch manager names into Club.philosophy. */
  applyManagerNames(
    changes: readonly { clubId: string; managerName: string }[],
  ): Promise<void>;
}
