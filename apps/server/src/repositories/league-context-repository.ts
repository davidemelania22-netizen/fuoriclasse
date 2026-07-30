/**
 * Where the protagonist plays, and how much the world cares. The same league
 * weight drives growth, fame and scouting attention, so it is loaded once per
 * week from here instead of being re-derived in each service.
 */
export interface ProtagonistLeague {
  competitionId: string;
  competitionName: string;
  competitionReputation: number;
  /** Reputation of the world's strongest league — the yardstick. */
  topLeagueReputation: number;
}

export interface LeagueContextRepository {
  /** Null when there is no protagonist, no club, or the club has no league. */
  loadProtagonistLeague(saveGameId: string): Promise<ProtagonistLeague | null>;
  /**
   * Applies a signed delta to the protagonist's reputation. Returns both sides
   * of the move so callers can spot a milestone being crossed; null when there
   * is no protagonist.
   */
  addProtagonistReputation(
    saveGameId: string,
    delta: number,
  ): Promise<{ before: number; after: number } | null>;
}
