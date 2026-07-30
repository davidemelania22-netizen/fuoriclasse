import type { RandomSource } from '../random/random-source';
import { clamp } from '../util/math';

/**
 * Scouting — from the player's side of the binoculars: scouts of bigger clubs
 * attend your matches, what they see moves their club's interest in you, and
 * enough sustained interest turns into a concrete transfer offer. Interest is
 * a 0-100 dossier per club, persisted in the protagonist's profile.
 */

export interface ScoutingClub {
  id: string;
  reputation: number;
}

/** Interest level at which a club stops watching and makes an offer. */
export const SCOUT_OFFER_THRESHOLD = 75;
/** Where the dossier settles right after an offer is triggered. */
export const SCOUT_INTEREST_AFTER_OFFER = 45;
/** Scouts show up somewhere between never and every week. */
const FIRST_SCOUT_CHANCE = 0.6;
const SECOND_SCOUT_CHANCE = 0.3;

const NEUTRAL_RATING = 6.3;
const RATING_SWING = 15;
const MATCH_EASING = 0.5;
/** A club that already has a dossier open follows you a bit more closely. */
const OPEN_DOSSIER_BONUS = 3;
/** Weekly fade for clubs that did not watch you. */
const IDLE_DECAY = 0.92;

/**
 * Which clubs send a scout to this match. Bigger clubs scout more; clubs with
 * an open dossier (existing interest) are weighted up so stories continue.
 */
export function pickScoutingClubs(
  candidates: readonly ScoutingClub[],
  openDossiers: ReadonlyMap<string, number>,
  rng: RandomSource,
  /** How closely the world watches this league (1 = a top division). */
  attention = 1,
): ScoutingClub[] {
  if (candidates.length === 0) return [];
  const watchers: ScoutingClub[] = [];
  const pool = [...candidates];

  const draw = (): void => {
    if (pool.length === 0) return;
    const picked = rng.weightedPick(
      pool.map((club) => ({
        value: club,
        weight:
          Math.max(1, club.reputation) *
          (openDossiers.has(club.id) ? OPEN_DOSSIER_BONUS : 1),
      })),
    );
    watchers.push(picked);
    pool.splice(pool.indexOf(picked), 1);
  };

  const watched = clamp(attention, 0, 2);
  if (rng.chance(clamp(FIRST_SCOUT_CHANCE * watched, 0, 1))) draw();
  if (rng.chance(clamp(SECOND_SCOUT_CHANCE * watched, 0, 1))) draw();
  return watchers;
}

/** Dossier movement when the club's scout actually watched the match. */
export function scoutInterestAfterMatch(
  current: number,
  rating: number,
): number {
  const target = clamp(50 + (rating - NEUTRAL_RATING) * RATING_SWING, 0, 100);
  return clamp(current + (target - current) * MATCH_EASING, 0, 100);
}

/** Weekly fade for a dossier nobody updated. Below 1 it closes (returns 0). */
export function scoutInterestIdle(current: number): number {
  const next = current * IDLE_DECAY;
  return next < 1 ? 0 : next;
}
