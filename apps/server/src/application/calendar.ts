import { INJURY_TYPES } from '@football-life/game-data';
import type {
  CalendarMonthData,
  CalendarRepository,
} from '../repositories/calendar-repository';

/** One badge inside a calendar day cell. */
export type CalendarEntry =
  | {
      kind: 'MATCH';
      fixtureId: string;
      competitionName: string;
      opponentName: string;
      isHome: boolean;
      status: string;
      /** "2-1" from the protagonist club's perspective, null if not played. */
      scoreLine: string | null;
      outcome: 'W' | 'D' | 'L' | null;
      /** Protagonist's numbers, when they took the pitch. */
      rating: number | null;
      goals: number;
      assists: number;
    }
  | { kind: 'NEWS'; category: string; headline: string }
  | { kind: 'INJURY'; phase: 'START' | 'END'; label: string };

export interface CalendarDayView {
  /** YYYY-MM-DD (UTC). */
  date: string;
  isToday: boolean;
  /** The protagonist is sidelined by an injury on this day. */
  injured: boolean;
  entries: CalendarEntry[];
}

export interface CalendarMonthView {
  /** YYYY-MM. */
  month: string;
  clubName: string | null;
  /** Save's current in-game date, YYYY-MM-DD. */
  currentDate: string;
  days: CalendarDayView[];
  /** Adjacent months reachable via navigation (bounded by the fixture span). */
  nav: { prev: string | null; next: string | null };
}

export interface CalendarDeps {
  calendar: CalendarRepository;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const isoMonth = (date: Date) => date.toISOString().slice(0, 7);

function monthStart(month: string): Date {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, m! - 1, 1));
}

function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  return isoMonth(new Date(Date.UTC(year!, m! - 1 + delta, 1)));
}

function injuryLabel(key: string): string {
  return INJURY_TYPES.find((t) => t.key === key)?.name ?? 'Infortunio';
}

export async function getCalendarMonth(
  deps: CalendarDeps,
  input: { saveGameId: string; month?: string | undefined },
): Promise<CalendarMonthView | null> {
  // Resolve the requested month, defaulting to the save's current one.
  let month = input.month && MONTH_RE.test(input.month) ? input.month : null;
  let data: CalendarMonthData | null;
  if (month) {
    data = await deps.calendar.loadCalendarMonth(input.saveGameId, {
      from: monthStart(month),
      to: monthStart(addMonths(month, 1)),
    });
  } else {
    // Peek at the save to learn its current date, then load that month.
    const probe = await deps.calendar.loadCalendarMonth(input.saveGameId, {
      from: new Date(0),
      to: new Date(0),
    });
    if (!probe) return null;
    month = isoMonth(probe.currentDate);
    data = await deps.calendar.loadCalendarMonth(input.saveGameId, {
      from: monthStart(month),
      to: monthStart(addMonths(month, 1)),
    });
  }
  if (!data) return null;

  const from = monthStart(month);
  const to = monthStart(addMonths(month, 1));
  const today = isoDay(data.currentDate);

  // Bucket entries by day.
  const buckets = new Map<string, CalendarEntry[]>();
  const push = (day: string, entry: CalendarEntry) => {
    const list = buckets.get(day);
    if (list) list.push(entry);
    else buckets.set(day, [entry]);
  };

  for (const fixture of data.fixtures) {
    const played = fixture.homeScore !== null && fixture.awayScore !== null;
    const ours = fixture.isHome ? fixture.homeScore : fixture.awayScore;
    const theirs = fixture.isHome ? fixture.awayScore : fixture.homeScore;
    push(isoDay(fixture.scheduledAt), {
      kind: 'MATCH',
      fixtureId: fixture.fixtureId,
      competitionName: fixture.competitionName,
      opponentName: fixture.opponentName,
      isHome: fixture.isHome,
      status: fixture.status,
      scoreLine: played ? `${ours}-${theirs}` : null,
      outcome: played ? (ours! > theirs! ? 'W' : ours! < theirs! ? 'L' : 'D') : null,
      rating: fixture.appearance ? fixture.appearance.rating : null,
      goals: fixture.appearance?.goals ?? 0,
      assists: fixture.appearance?.assists ?? 0,
    });
  }
  for (const item of data.news) {
    push(isoDay(item.gameDate), {
      kind: 'NEWS',
      category: item.category,
      headline: item.headline,
    });
  }
  for (const injury of data.injuries) {
    const label = injuryLabel(injury.injuryTypeKey);
    if (injury.startedAt >= from && injury.startedAt < to) {
      push(isoDay(injury.startedAt), { kind: 'INJURY', phase: 'START', label });
    }
    if (injury.healed && injury.endAt >= from && injury.endAt < to) {
      push(isoDay(injury.endAt), { kind: 'INJURY', phase: 'END', label });
    }
  }

  // Assemble every day of the month.
  const days: CalendarDayView[] = [];
  for (
    let cursor = new Date(from);
    cursor < to;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const date = isoDay(cursor);
    days.push({
      date,
      isToday: date === today,
      injured: data.injuries.some(
        (injury) => isoDay(injury.startedAt) <= date && date <= isoDay(injury.endAt),
      ),
      entries: buckets.get(date) ?? [],
    });
  }

  // Navigation stays within the club's fixture span (with the current month
  // always reachable), so arrows never lead to endless empty months.
  const currentMonth = isoMonth(data.currentDate);
  const firstMonth = data.bounds
    ? minMonth(isoMonth(data.bounds.first), currentMonth)
    : currentMonth;
  const lastMonth = data.bounds
    ? maxMonth(isoMonth(data.bounds.last), currentMonth)
    : currentMonth;
  return {
    month,
    clubName: data.clubName,
    currentDate: today,
    days,
    nav: {
      prev: month > firstMonth ? addMonths(month, -1) : null,
      next: month < lastMonth ? addMonths(month, 1) : null,
    },
  };
}

const minMonth = (a: string, b: string) => (a < b ? a : b);
const maxMonth = (a: string, b: string) => (a > b ? a : b);
