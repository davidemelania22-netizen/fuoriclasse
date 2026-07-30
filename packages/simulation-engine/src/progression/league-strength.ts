import { clamp } from '../util/math';

/**
 * How much a league counts. Scoring 30 in a second division is not the same
 * as scoring 20 at the top: the factor scales what a performance is worth —
 * reputation gained, scouts' attention, and the weight of an award.
 *
 * The reference point is the world's strongest league (factor 1). Weaker
 * competitions fall off towards FLOOR, so a modest league still counts for
 * something — it just never wins you a Ballon d'Or.
 */
const FLOOR = 0.45;
/** Below this share of the top league, a competition is a different planet. */
const CURVE = 1.35;

export function leagueStrengthFactor(
  competitionReputation: number,
  topLeagueReputation: number,
): number {
  if (topLeagueReputation <= 0) return 1;
  const share = clamp(competitionReputation / topLeagueReputation, 0, 1);
  return clamp(FLOOR + (1 - FLOOR) * Math.pow(share, CURVE), FLOOR, 1);
}

const BANDS: { min: number; label: string }[] = [
  { min: 0.92, label: 'Campionato di vertice' },
  { min: 0.78, label: 'Grande campionato' },
  { min: 0.62, label: 'Buon campionato' },
  { min: 0.5, label: 'Campionato minore' },
  { min: 0, label: 'Campionato di provincia' },
];

/** Plain-Italian label for the factor, for the transfer screens. */
export function leagueStrengthLabel(factor: number): string {
  return BANDS.find((band) => factor >= band.min)!.label;
}

/** Stars 1-5, so the UI can show the gap at a glance. */
export function leagueStrengthStars(factor: number): number {
  return clamp(Math.round(1 + (factor - FLOOR) * (4 / (1 - FLOOR))), 1, 5);
}

/** Maps a factor in [FLOOR, 1] onto an arbitrary output range. */
function scaleFromFactor(factor: number, atFloor: number, atTop: number): number {
  const share = clamp((factor - FLOOR) / (1 - FLOOR), 0, 1);
  return atFloor + (atTop - atFloor) * share;
}

/**
 * Training against better opponents develops a player faster. The spread is
 * deliberately narrow: the league nudges growth, talent and work still decide
 * it. Feeds `applyWeeklyTraining`'s difficultyModifier.
 */
export function leagueGrowthModifier(factor: number): number {
  return scaleFromFactor(factor, 0.85, 1.12);
}

/**
 * How likely scouts are to be in the stands at all. In a provincial league
 * they rarely bother; at the top every match is watched. Multiplies the
 * attendance chances in `pickScoutingClubs`.
 */
export function leagueScoutAttention(factor: number): number {
  return scaleFromFactor(factor, 0.45, 1.15);
}

export interface ReputationMatch {
  /** Match rating on the 1-10 pagella scale. */
  rating: number;
  goals: number;
  assists: number;
}

/** Below this rating a performance is forgettable and moves nothing. */
const REPUTATION_NEUTRAL_RATING = 6.4;
const REPUTATION_PER_RATING_POINT = 9;
const REPUTATION_PER_GOAL = 7;
const REPUTATION_PER_ASSIST = 3;
/** A bad game costs you, but far less than a good one earns. */
const REPUTATION_BAD_GAME_SCALE = 0.35;

/**
 * What a match does to the player's name. The same hat-trick is worth much
 * more at the top than in a provincial league: fame follows the shop window,
 * not just the numbers.
 */
export function reputationGainFromMatch(
  match: ReputationMatch,
  leagueStrength: number,
): number {
  const ratingDelta = match.rating - REPUTATION_NEUTRAL_RATING;
  const base =
    ratingDelta * REPUTATION_PER_RATING_POINT +
    match.goals * REPUTATION_PER_GOAL +
    match.assists * REPUTATION_PER_ASSIST;
  const scaled = base >= 0 ? base : base * REPUTATION_BAD_GAME_SCALE;
  return scaled * clamp(leagueStrength, FLOOR, 1);
}
