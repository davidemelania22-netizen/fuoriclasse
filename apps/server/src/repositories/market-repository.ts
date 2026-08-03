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
  /** Rewrite an offer's terms once the table has agreed them. */
  updateOfferTerms(input: {
    offerId: string;
    playerId: string;
    weeklyWage: number;
    squadRole: string;
    contractYears?: number;
  }): Promise<boolean>;
  /**
   * Bonuses live on the contract, not on the offer, so they are written once
   * the contract exists — right after signing.
   */
  setContractBonuses(input: {
    playerId: string;
    signingBonus: number;
    appearanceBonus: number;
    goalBonus: number;
  }): Promise<boolean>;
}
