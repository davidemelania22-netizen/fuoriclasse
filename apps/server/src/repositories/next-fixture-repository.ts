/** The protagonist's next unplayed fixture, with rivalry context for derbies. */
export interface NextFixtureData {
  seed: string;
  fixtureId: string;
  isHome: boolean;
  opponentClubId: string;
  opponentName: string;
  date: Date;
  competitionName: string;
  /** Closest-reputation club in the same league — the protagonist's rival. */
  rivalClubId: string | null;
}

export interface NextFixtureRepository {
  /** Null when the protagonist has no club or no scheduled fixture. */
  loadNextFixture(saveGameId: string): Promise<NextFixtureData | null>;
}
