/**
 * When the transfer market is open.
 *
 * Windows are measured against the season's own start, not the calendar: the
 * game's seasons are 38 matchdays plus a break and drift away from real dates
 * after a few years, so "1 July to 31 August" would slowly stop meaning
 * pre-season. Counting weeks from kick-off keeps the summer window in summer
 * for as long as the career lasts.
 */

const WEEK_MS = 7 * 86_400_000;

/**
 * Summer: the eight weeks before kick-off and the two after it. Eight, not
 * six, because a new career starts on 1 July against a mid-August kick-off —
 * at six the game began with the market already shut, which is the one moment
 * it must be open.
 */
const SUMMER_OPENS_WEEKS_BEFORE = 8;
const SUMMER_CLOSES_WEEKS_AFTER = 2;

/** Winter: a short window around the halfway point of a 38-matchday season. */
const WINTER_OPENS_WEEK = 18;
const WINTER_CLOSES_WEEK = 21;

export type TransferWindowKind = 'SUMMER' | 'WINTER';

export interface TransferWindowState {
  isOpen: boolean;
  /** Which window is open, or which one comes next when shut. */
  kind: TransferWindowKind;
  /** Days until it shuts (when open) or opens (when shut). */
  daysAway: number;
  opensAt: Date;
  closesAt: Date;
}

interface Window {
  kind: TransferWindowKind;
  opensAt: number;
  closesAt: number;
}

function windowsAround(seasonStartMs: number): Window[] {
  const seasonMs = 44 * WEEK_MS;
  const windows: Window[] = [];
  // The season before, this one and the next: enough that a date anywhere in
  // the year finds both the window it is in and the one it is waiting for.
  for (const offset of [-seasonMs, 0, seasonMs]) {
    const start = seasonStartMs + offset;
    windows.push({
      kind: 'SUMMER',
      opensAt: start - SUMMER_OPENS_WEEKS_BEFORE * WEEK_MS,
      closesAt: start + SUMMER_CLOSES_WEEKS_AFTER * WEEK_MS,
    });
    windows.push({
      kind: 'WINTER',
      opensAt: start + WINTER_OPENS_WEEK * WEEK_MS,
      closesAt: start + WINTER_CLOSES_WEEK * WEEK_MS,
    });
  }
  return windows.sort((a, b) => a.opensAt - b.opensAt);
}

const days = (ms: number) => Math.max(0, Math.ceil(ms / 86_400_000));

/**
 * The state of the market on `date`, for a season that kicked off on
 * `seasonStart`.
 */
export function transferWindowAt(
  date: Date,
  seasonStart: Date,
): TransferWindowState {
  const now = date.getTime();
  const windows = windowsAround(seasonStart.getTime());

  const open = windows.find((w) => now >= w.opensAt && now <= w.closesAt);
  if (open) {
    return {
      isOpen: true,
      kind: open.kind,
      daysAway: days(open.closesAt - now),
      opensAt: new Date(open.opensAt),
      closesAt: new Date(open.closesAt),
    };
  }

  // Shut: point at the next one. Past the last modelled window we fall back to
  // it rather than inventing a date, which only happens far outside a career.
  const next =
    windows.find((w) => w.opensAt > now) ?? windows[windows.length - 1]!;
  return {
    isOpen: false,
    kind: next.kind,
    daysAway: days(next.opensAt - now),
    opensAt: new Date(next.opensAt),
    closesAt: new Date(next.closesAt),
  };
}

/** Words for the window, for the screen. */
export function transferWindowLabel(kind: TransferWindowKind): string {
  return kind === 'SUMMER' ? 'Mercato estivo' : 'Mercato invernale';
}
