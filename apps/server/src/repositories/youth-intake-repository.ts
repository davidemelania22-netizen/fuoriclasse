/** Clubs whose academies graduate a class on youth intake day. */
export interface IntakeClub {
  id: string;
  name: string;
  countryId: string;
  academyQuality: number;
  strength: number;
}

export interface YouthIntakeState {
  seed: string;
  currentDate: Date;
  clubs: IntakeClub[];
  /** Protagonist context, to spot an academy rival in their own role. */
  protagonistClubId: string | null;
  protagonistPosition: string | null;
}

export interface YouthIntakeRepository {
  loadIntakeState(saveGameId: string): Promise<YouthIntakeState | null>;
}
