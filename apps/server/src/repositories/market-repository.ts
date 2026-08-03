/** A move that actually happened in the world, for the market's news column. */
export interface WorldTransferRecord {
  date: string;
  headline: string;
  body: string;
}

export interface MarketState {
  playerId: string;
  currentDate: Date;
  /** Kick-off of the season the protagonist's league is playing. */
  seasonStart: Date | null;
  seasonLabel: string | null;
  currentAbility: number;
  marketValue: number;
  clubId: string | null;
  clubName: string | null;
  /** What the player earns today, to compare an offer against. */
  currentWeeklyWage: number | null;
  currentSquadRole: string | null;
  currentContractEnd: Date | null;
  currentClubReputation: number | null;
}

export interface MarketRepository {
  loadMarketState(saveGameId: string): Promise<MarketState | null>;
  /** The most recent transfers reported in the world, newest first. */
  listWorldTransfers(
    saveGameId: string,
    limit: number,
  ): Promise<WorldTransferRecord[]>;
  /** Rewrite an offer's terms after a successful negotiation. */
  updateOfferTerms(input: {
    offerId: string;
    playerId: string;
    weeklyWage: number;
    squadRole: string;
  }): Promise<boolean>;
}
