export interface ProtagonistContract {
  id: string;
  clubId: string;
  endDate: Date;
  squadRole: string;
  weeklyWage: number;
}

export interface ProtagonistCareer {
  saveGameId: string;
  playerId: string;
  currentDate: Date;
  age: number;
  currentAbility: number;
  potentialAbility: number;
  form: number;
  reputation: number;
  marketValue: number;
  clubId: string | null;
  leagueReputation: number;
  currentContract: ProtagonistContract | null;
}

export interface CandidateClub {
  clubId: string;
  reputation: number;
  strength: number;
  transferBudget: number;
}

/** Rich club info for the club-selection UI. */
export interface ClubDirectoryEntry {
  clubId: string;
  name: string;
  shortName: string;
  logo: string | null;
  reputation: number;
  strength: number;
  competitionName: string | null;
  countryId: string;
}

export interface SignContractInput {
  saveGameId: string;
  playerId: string;
  clubId: string;
  startDate: Date;
  endDate: Date;
  weeklyWage: number;
  signingBonus: number;
  appearanceBonus: number;
  goalBonus: number;
  squadRole: string;
}

export interface RenewContractInput {
  contractId: string;
  newEndDate: Date;
  weeklyWage: number;
  squadRole: string;
}

export interface OfferInput {
  fromClubId: string;
  toClubId: string;
  fee: number;
  offeredWage: number;
  contractYears: number;
  squadRole: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface PendingOffer {
  id: string;
  fromClubId: string;
  toClubId: string;
  fee: number;
  offeredWage: number;
  contractYears: number;
  squadRole: string;
}

export interface AcceptOfferInput {
  offerId: string;
  saveGameId: string;
  playerId: string;
  startDate: Date;
}

export interface CareerRepository {
  loadProtagonist(saveGameId: string): Promise<ProtagonistCareer | null>;
  listCandidateClubs(saveGameId: string): Promise<CandidateClub[]>;
  listClubDirectory(saveGameId: string): Promise<ClubDirectoryEntry[]>;
  signContract(input: SignContractInput): Promise<void>;
  renewContract(input: RenewContractInput): Promise<void>;
  createOffers(playerId: string, offers: OfferInput[]): Promise<string[]>;
  /** Mark all currently-pending offers for the player as expired. */
  expirePendingOffers(playerId: string): Promise<void>;
  listPendingOffers(playerId: string): Promise<PendingOffer[]>;
  acceptOffer(input: AcceptOfferInput): Promise<boolean>;
  rejectOffer(offerId: string): Promise<void>;
  updateMarketValue(playerId: string, value: number): Promise<void>;
}
