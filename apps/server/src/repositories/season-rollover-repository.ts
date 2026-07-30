export interface RolloverLeague {
  competitionId: string;
  countryId: string | null;
  tier: number;
  /** The just-completed season. */
  seasonId: string;
  seasonLabel: string;
  seasonStartMs: number;
  seasonEndMs: number;
  /** Clubs currently assigned to this competition. */
  clubIds: string[];
  /** Club ids in final standing order, champion first. */
  rankedClubIds: string[];
}

export interface RolloverState {
  saveGameId: string;
  leagues: RolloverLeague[];
}

export interface NextSeasonFixture {
  matchday: number;
  homeClubId: string;
  awayClubId: string;
  scheduledAt: Date;
}

export interface NextSeasonPlan {
  competitionId: string;
  label: string;
  startDate: Date;
  endDate: Date;
  /** Clubs in this competition after promotions/relegations. */
  clubIds: string[];
  fixtures: NextSeasonFixture[];
}

export interface RolloverPersistence {
  swaps: { clubId: string; toCompetitionId: string }[];
  seasons: NextSeasonPlan[];
}

export interface SeasonRolloverRepository {
  /** Null when no rollover is due (a league season is still in progress). */
  loadRolloverState(saveGameId: string): Promise<RolloverState | null>;
  persistRollover(saveGameId: string, data: RolloverPersistence): Promise<void>;
}
