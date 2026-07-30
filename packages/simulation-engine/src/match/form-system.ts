import { clamp } from '../util/math';

/** Match rating that leaves form unchanged; above lifts it, below drops it. */
const NEUTRAL_RATING = 6.3;
/** Form points of target swing per rating point away from neutral. */
const RATING_SWING = 14;
/** How much of the gap to the match target is closed in one game. */
const MATCH_EASING = 0.6;
/** Resting form level a player drifts back to when idle. */
const IDLE_BASELINE = 50;
/** Fraction of the gap to the baseline closed each idle week. */
const IDLE_DECAY = 0.25;

/**
 * New form after a match, easing the player's current form toward a target
 * derived from their performance rating. Sustained good ratings build form;
 * poor games erode it.
 */
export function formAfterMatch(currentForm: number, rating: number): number {
  const target = clamp(50 + (rating - NEUTRAL_RATING) * RATING_SWING, 0, 100);
  return clamp(currentForm + (target - currentForm) * MATCH_EASING, 0, 100);
}

/** New form after a week without playing: a drift back toward the baseline. */
export function formWhenIdle(currentForm: number): number {
  return clamp(currentForm + (IDLE_BASELINE - currentForm) * IDLE_DECAY, 0, 100);
}
