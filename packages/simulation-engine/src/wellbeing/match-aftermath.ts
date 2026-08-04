import { clamp } from '../util/math';

/**
 * What a matchday leaves behind.
 *
 * Training alone never tired anyone out: recovery outpaced even the hardest
 * week, so condition sat at 100 for entire careers and morale sat at its
 * baseline whatever happened on Sunday. Ninety minutes is the real load, and
 * the result is the real mood — this is where both come from.
 */

export interface MatchOutcome {
  /** False when the protagonist was not picked for a fixture his club played. */
  played: boolean;
  minutes: number;
  rating: number;
  goals: number;
  won: boolean;
  drew: boolean;
}

export interface Aftermath {
  /** Added to fatigue, 0-100. */
  fatigue: number;
  /** Added to morale, 0-100. */
  morale: number;
}

/** A full ninety minutes costs this much fatigue. */
const FULL_MATCH_FATIGUE = 19;

/**
 * Most a week on the bench can cost, however many games went by. Applied per
 * fixture it compounded — two games a week drove morale to zero inside two
 * months and left nothing that could pull it back up.
 */
const MAX_BENCH_MISERY = 4;

/**
 * The mark left by the matches of one week. Returned as deltas so the caller
 * can apply them to whatever the player's state is when they land.
 */
export function matchAftermath(outcomes: readonly MatchOutcome[]): Aftermath {
  let fatigue = 0;
  let morale = 0;
  let bench = 0;

  for (const match of outcomes) {
    if (!match.played) {
      // Watching your team play is its own small misery, but a congested week
      // spent watching is not three times worse than a quiet one.
      bench = Math.min(MAX_BENCH_MISERY, bench + 3);
      continue;
    }

    fatigue += (clamp(match.minutes, 0, 120) / 90) * FULL_MATCH_FATIGUE;

    morale += match.won ? 5 : match.drew ? 1 : -4;
    // A personal performance counts whatever the team did around it.
    if (match.rating >= 7.5) morale += 4;
    else if (match.rating >= 6.5) morale += 2;
    else if (match.rating < 5.5) morale -= 3;
    morale += Math.min(3, match.goals) * 2;
  }

  return { fatigue, morale: morale - bench };
}

/** Condition is the visible face of fatigue; they never disagree. */
export const conditionFromFatigue = (fatigue: number): number =>
  clamp(100 - 0.9 * fatigue, 10, 100);
