/** Honour row used to tell apart personal awards from the club's trophies. */
export interface SummaryHonourRow {
  id: string;
  type: string;
  competitionName: string | null;
  seasonLabel: string;
  clubId: string | null;
  clubName: string | null;
  playerId: string | null;
}

export interface SeasonSummaryContext {
  playerId: string;
  /** The protagonist's club when the fast-forward started, if any. */
  clubId: string | null;
  clubName: string | null;
  /** Label of the league season currently in progress, if any. */
  seasonLabel: string | null;
}

export interface SeasonSummaryRepository {
  /** Null when the save has no protagonist. */
  loadContext(saveGameId: string): Promise<SeasonSummaryContext | null>;
  listHonours(saveGameId: string): Promise<SummaryHonourRow[]>;
}
