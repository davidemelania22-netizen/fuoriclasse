/** The negotiation session, as stored. Structural on purpose: the shape is
 * owned by `application/contract-talks`, and the repository only carries it. */
export interface StoredContractPackage {
  years: number;
  weeklyWage: number;
  signingBonus: number;
  appearanceBonus: number;
  goalBonus: number;
  squadRole: string;
}

export interface StoredContractTalks {
  /** An offer id, or the reserved renewal subject. */
  subject: string;
  baseline: StoredContractPackage;
  clubPosition: StoredContractPackage;
  patience: number;
  round: number;
  status: 'OPEN' | 'AGREED' | 'BROKEN';
  lastVerdict: string | null;
  lastMessage: string | null;
  /**
   * True once the player has left the table. The session is kept rather than
   * deleted so the patience already spent is not refunded by walking out and
   * walking back in. Absent on sessions stored before this existed.
   */
  dismissed?: boolean;
  /** True once an agent has improved the opening package. Only ever once. */
  agentBoosted?: boolean;
}

/**
 * A renewal just agreed, waiting for its moment on screen.
 *
 * A signing is derived — the club under contract differs from the last one
 * presented — but a renewal changes no club, so nothing about the state can
 * tell you it happened. This is the one thing that has to be remembered.
 */
export interface StoredPendingRenewal {
  clubId: string;
  years: number;
  weeklyWage: number;
  squadRole: string;
  signedAt: string;
}

/**
 * What the club remembers between negotiations: how long it is still annoyed
 * for, and when it last put pen to paper. Absent on saves from before it
 * existed, which simply means a club with nothing to hold against you.
 */
export interface StoredTalksMemory {
  /** ISO date before which no club will sit down again. */
  coolingOffUntil: string | null;
  /** ISO date the current contract was agreed. */
  lastSignedAt: string | null;
}

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
  /**
   * Club whose presentation the player has already watched. Comparing it
   * with the club they are actually under contract with is what decides
   * whether a presentation is owed — so every way of joining a club, today's
   * and tomorrow's, triggers the scene without touching the signing code.
   */
  lastPresentedClubId: string | null;
  /**
   * Honours whose ceremony has already played. Kept as a list of ids rather
   * than a high-water mark because trophies arrive in bunches at the end of
   * a season and the player watches them one at a time; a career tops out at
   * a few dozen, so the list stays small.
   */
  celebratedHonourIds: string[];
  /** Offers the player has already pushed on: one negotiation each. */
  negotiatedOfferIds: string[];
  /** The contract table currently open, if any. Shape owned by contract-talks. */
  contractTalks: StoredContractTalks | null;
  /** What the club remembers about past negotiations. */
  talksMemory: StoredTalksMemory | null;
  /** A renewal signed but not yet celebrated on screen. */
  pendingRenewal: StoredPendingRenewal | null;
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
  /** Remember that the presentation for this club has been watched. */
  setLastPresentedClub(saveGameId: string, clubId: string): Promise<boolean>;
  /** Persist the honours whose ceremony has already played. */
  setCelebratedHonours(
    saveGameId: string,
    honourIds: string[],
  ): Promise<boolean>;
  /** Persist which offers have been negotiated, so nobody asks twice. */
  setNegotiatedOffers(saveGameId: string, offerIds: string[]): Promise<boolean>;
  /** Store (or clear, when null) the contract table in progress. */
  setContractTalks(
    saveGameId: string,
    talks: StoredContractTalks | null,
  ): Promise<boolean>;
  /** Persist what the club remembers about past negotiations. */
  setTalksMemory(
    saveGameId: string,
    memory: StoredTalksMemory,
  ): Promise<boolean>;
  /** Store (or clear, when null) the renewal awaiting its scene. */
  setPendingRenewal(
    saveGameId: string,
    renewal: StoredPendingRenewal | null,
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
