export interface CalendarCompetition {
  competitionId: string;
  /** CUP | CONTINENTAL | INTERNATIONAL */
  type: string;
  name: string;
  countryId: string | null;
}

export interface ExistingHonourKey {
  type: string;
  competitionId: string | null;
  seasonLabel: string;
}

export interface CompetitionCalendarState {
  currentDate: Date;
  /** Start of the current (latest) league season. */
  seasonStartMs: number;
  /** Date of the current season's final league matchday, in ms. */
  lastMatchdayMs: number;
  competitions: CalendarCompetition[];
  honours: ExistingHonourKey[];
}

export interface CompetitionCalendarRepository {
  loadCalendarState(
    saveGameId: string,
  ): Promise<CompetitionCalendarState | null>;
}
