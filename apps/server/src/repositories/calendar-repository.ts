/** Raw data behind the monthly calendar screen. */
export interface CalendarFixtureData {
  fixtureId: string;
  scheduledAt: Date;
  status: string;
  competitionName: string;
  isHome: boolean;
  opponentName: string;
  homeScore: number | null;
  awayScore: number | null;
  /** Protagonist's appearance in this fixture, if they played. */
  appearance: {
    rating: number;
    goals: number;
    assists: number;
    minutesPlayed: number;
  } | null;
}

export interface CalendarNewsData {
  gameDate: Date;
  category: string;
  headline: string;
}

export interface CalendarInjuryData {
  injuryTypeKey: string;
  startedAt: Date;
  /** Actual end when healed, otherwise the expected one. */
  endAt: Date;
  healed: boolean;
}

export interface CalendarMonthData {
  currentDate: Date;
  clubName: string | null;
  fixtures: CalendarFixtureData[];
  news: CalendarNewsData[];
  injuries: CalendarInjuryData[];
  /** Full fixture span of the save, to bound month navigation. */
  bounds: { first: Date; last: Date } | null;
}

export interface CalendarRepository {
  /** Null when the save does not exist. Range is [from, to). */
  loadCalendarMonth(
    saveGameId: string,
    range: { from: Date; to: Date },
  ): Promise<CalendarMonthData | null>;
}
