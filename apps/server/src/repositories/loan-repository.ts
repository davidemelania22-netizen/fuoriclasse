/** What the loan logic needs to know about the protagonist right now. */
export interface LoanContext {
  playerId: string;
  age: number;
  clubId: string | null;
  clubName: string | null;
  countryId: string | null;
  /** Division tier of the current club (1 = top), null when unattached. */
  tier: number | null;
  /** Label of the club's current league season, if any. */
  seasonLabel: string | null;
  /** League appearances in the current season. */
  appearancesThisSeason: number;
}

export interface LoanCandidate {
  clubId: string;
  clubName: string;
  competitionName: string;
  reputation: number;
}

export interface LoanRepository {
  /** Null when the save has no protagonist. */
  loadContext(saveGameId: string): Promise<LoanContext | null>;
  /** Clubs in the given country playing one division below `tier`. */
  listCandidates(
    saveGameId: string,
    countryId: string,
    tier: number,
  ): Promise<LoanCandidate[]>;
  /** Moves the protagonist's shirt; the contract is untouched. */
  moveToClub(playerId: string, clubId: string): Promise<void>;
}
