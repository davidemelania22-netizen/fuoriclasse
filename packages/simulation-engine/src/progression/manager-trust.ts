import { clamp } from '../util/math';

/**
 * Manager trust: how much the coach believes in the protagonist right now.
 * Distinct from form (match-driven sharpness) — trust is the standing the
 * player holds in the pecking order. It rises and falls with performances,
 * feeds XI selection (a trusted player starts ahead of equal ability) and
 * drifts back toward the contractual role while the player sits out.
 */

/** Starting/anchor trust for each contractual squad role. */
const ROLE_BASELINE: Record<string, number> = {
  KEY: 80,
  FIRST_TEAM: 64,
  ROTATION: 48,
  BACKUP: 32,
  PROSPECT: 22,
};
const DEFAULT_BASELINE = 48;

const MATCH_EASING = 0.45;
const NEUTRAL_RATING = 6.4;
const RATING_SWING = 12;
const GOAL_BONUS = 4;
const ASSIST_BONUS = 2;
const RED_CARD_PENALTY = 8;
const BENCH_EASING = 0.15;

/** Anchor trust implied by a contractual squad role (KEY, FIRST_TEAM, …). */
export function roleBaseline(squadRole: string | null | undefined): number {
  return ROLE_BASELINE[squadRole ?? ''] ?? DEFAULT_BASELINE;
}

export interface MatchTrustInput {
  rating: number;
  goals: number;
  assists: number;
  redCards: number;
}

/** Trust after a match the protagonist actually played. */
export function trustAfterMatch(
  currentTrust: number,
  input: MatchTrustInput,
): number {
  const base = clamp(
    50 + (input.rating - NEUTRAL_RATING) * RATING_SWING,
    0,
    100,
  );
  const target = clamp(
    base +
      input.goals * GOAL_BONUS +
      input.assists * ASSIST_BONUS -
      input.redCards * RED_CARD_PENALTY,
    0,
    100,
  );
  return clamp(currentTrust + (target - currentTrust) * MATCH_EASING, 0, 100);
}

/**
 * Trust drifts back toward the role baseline while the fit player is benched:
 * a dropped player slowly earns another look, an over-performer cools without
 * minutes. Injured players hold instead (caller decides).
 */
export function trustWhenBenched(
  currentTrust: number,
  baseline: number,
): number {
  return clamp(currentTrust + (baseline - currentTrust) * BENCH_EASING, 0, 100);
}

export interface EffectiveRole {
  key: string;
  label: string;
}

const BANDS: { min: number; key: string; label: string }[] = [
  { min: 80, key: 'UNDROPPABLE', label: 'Inamovibile' },
  { min: 62, key: 'STARTER', label: 'Titolare' },
  { min: 42, key: 'ROTATION', label: 'Rotazione' },
  { min: 25, key: 'FRINGE', label: 'Riserva' },
  { min: 0, key: 'OUTCAST', label: 'Fuori dai piani' },
];

/** The label the player would give their current place in the squad. */
export function roleFromTrust(trust: number): EffectiveRole {
  const band = BANDS.find((b) => trust >= b.min) ?? BANDS[BANDS.length - 1]!;
  return { key: band.key, label: band.label };
}

/**
 * How much manager preference nudges the protagonist's XI selection score.
 * Zero at neutral trust (50); positive when trusted, negative when out of
 * favour — so earning trust secures a starting spot and losing it drops you.
 */
export function selectionBiasFromTrust(trust: number): number {
  return (trust - 50) * 0.5;
}
