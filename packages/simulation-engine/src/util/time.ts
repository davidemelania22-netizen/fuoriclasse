const DAY_MS = 86_400_000;
const SEASON_YEAR_DAYS = 365;

/** Return a new Date offset by `days` (UTC, non-mutating). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Calendar age in whole years at `at`. */
export function calendarAge(birthDate: Date, at: Date): number {
  let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = at.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && at.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

/**
 * Index of the season `at` falls in, counting 365-day seasons from `start`.
 * Used to detect season rollovers when advancing the clock.
 */
export function seasonIndexSince(start: Date, at: Date): number {
  return Math.floor(
    (at.getTime() - start.getTime()) / (SEASON_YEAR_DAYS * DAY_MS),
  );
}
