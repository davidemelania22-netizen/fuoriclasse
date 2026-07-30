/** Per-save protagonist profile stored in Person.personalityProfile JSON. */
/** A pre-match plan the player prepared for a specific upcoming fixture. */
export interface StoredMatchPlan {
  fixtureId: string;
  approach: string;
  choices: Record<string, string>;
  isDerby: boolean;
}

/** A flash interview waiting for the protagonist after a match. */
export interface StoredPostMatch {
  questionKey: string;
  opponent: string;
  /** e.g. "2-1" from the protagonist's perspective context line. */
  resultLine: string;
}

export interface PlayerProfile {
  agentKey: string | null;
  lifestyle: string | null;
  /** Uploaded profile image as a data URL, or null when empty. */
  avatarDataUrl: string | null;
  /** Manager trust 0-100, or null before the first match judges the player. */
  managerTrust: number | null;
  /** Prepared plan for the next match, or null if none. */
  matchPlan: StoredMatchPlan | null;
  /** Post-match flash interview awaiting an answer, or null. */
  postMatchPending: StoredPostMatch | null;
  /** Scouting dossiers: interest 0-100 per club id watching the protagonist. */
  scoutInterest: Record<string, number>;
  /** Personal tactical instructions (style/temperament), or null = defaults. */
  tacticalInstructions: { style: string; temperament: string } | null;
  /** National-team call-up for a season, or null before the first one. */
  nationalCallup: StoredNationalCallup | null;
  /** Loan spell in progress, or null when playing for the parent club. */
  activeLoan: StoredLoan | null;
  /** Loan destinations on the table this season, or null when none. */
  loanOffer: StoredLoanOffer | null;
  /**
   * Country the player is tied to by having answered a call-up. Once set,
   * no federation can naturalise them — the FIFA rule, and the reason
   * accepting a call-up is a real decision.
   */
  cappedForCountryId: string | null;
  /** Naturalisation on the table, or the answer already given. */
  naturalization: StoredNaturalization | null;
}

/** A federation's approach: change the shirt you play for, or stay loyal. */
export interface StoredNaturalization {
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  countryId: string;
  countryName: string;
  /** Nationality held when the offer arrived. */
  previousCountryId: string;
  previousCountryName: string;
  seasonLabel: string;
}

/**
 * A loan keeps the contract at the parent club: only the shirt changes, and
 * at the end of the season the player goes back.
 */
export interface StoredLoan {
  parentClubId: string;
  parentClubName: string;
  loanClubId: string;
  loanClubName: string;
  /** Season the loan runs for; it ends at the next season boundary. */
  seasonLabel: string;
}

export interface StoredLoanOption {
  clubId: string;
  clubName: string;
  competitionName: string;
  reputation: number;
}

export interface StoredLoanOffer {
  seasonLabel: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  parentClubName: string;
  options: StoredLoanOption[];
}

/** PENDING = announced, awaiting the player's answer. NOT_CALLED = evaluated
 * this season, left out (stored so the check doesn't rerun weekly). */
export interface StoredNationalCallup {
  seasonLabel: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'NOT_CALLED';
  competitionName: string;
  countryName: string;
}

export interface ProfileRepository {
  getProfile(saveGameId: string): Promise<PlayerProfile | null>;
  setAgent(saveGameId: string, agentKey: string): Promise<boolean>;
  setLifestyle(saveGameId: string, lifestyle: string): Promise<boolean>;
  /** Store (or clear, when null) the protagonist's profile image. */
  setAvatar(saveGameId: string, avatarDataUrl: string | null): Promise<boolean>;
  /** Persist the evolving manager trust (0-100). */
  setManagerTrust(saveGameId: string, trust: number): Promise<boolean>;
  /** Store (or clear, when null) the prepared plan for the next match. */
  setMatchPlan(
    saveGameId: string,
    plan: StoredMatchPlan | null,
  ): Promise<boolean>;
  /** Store (or clear, when null) the pending post-match interview. */
  setPostMatchPending(
    saveGameId: string,
    pending: StoredPostMatch | null,
  ): Promise<boolean>;
  /** Persist the scouting dossiers (interest per club id). */
  setScoutInterest(
    saveGameId: string,
    interest: Record<string, number>,
  ): Promise<boolean>;
  /** Persist the personal tactical instructions. */
  setTacticalInstructions(
    saveGameId: string,
    instructions: { style: string; temperament: string },
  ): Promise<boolean>;
  /** Persist the season's national call-up state. */
  setNationalCallup(
    saveGameId: string,
    callup: StoredNationalCallup,
  ): Promise<boolean>;
  /** Store (or clear, when null) the loan spell in progress. */
  setActiveLoan(saveGameId: string, loan: StoredLoan | null): Promise<boolean>;
  /** Store (or clear, when null) the loan destinations on the table. */
  setLoanOffer(
    saveGameId: string,
    offer: StoredLoanOffer | null,
  ): Promise<boolean>;
  /** Tie the player to a national team for good. */
  setCappedForCountry(saveGameId: string, countryId: string): Promise<boolean>;
  /** Store (or clear, when null) the naturalisation offer or its answer. */
  setNaturalization(
    saveGameId: string,
    naturalization: StoredNaturalization | null,
  ): Promise<boolean>;
}
