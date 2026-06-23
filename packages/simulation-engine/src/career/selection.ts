import type { CareerConfig } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { clamp } from '../util/math';

export interface SelectionPlayer {
  currentAbility: number;
  form: number;
  condition: number;
  tacticalFit?: number;
  /** Coach relationship on a -100..100 scale. */
  coachRelationship: number;
  /** Contract / squad-role importance, 0..100. */
  contractImportance: number;
}

/** SelectionAI: how strongly a player merits a starting place this week. */
export function computeStartingScore(
  player: SelectionPlayer,
  config: CareerConfig,
  rng: RandomSource,
): number {
  const w = config.selection.weights;
  const tacticalFit = player.tacticalFit ?? config.selection.defaultTacticalFit;
  const coachRelationship = clamp((player.coachRelationship + 100) / 2, 0, 100);
  const noise = rng.next() * 100;

  return (
    player.currentAbility * w.ability +
    player.form * w.form +
    player.condition * w.condition +
    tacticalFit * w.tacticalFit +
    coachRelationship * w.coachRelationship +
    player.contractImportance * w.contractImportance +
    noise * w.noise
  );
}

export interface SelectionDecision {
  starter: boolean;
  convoked: boolean;
  expectedMinutes: number;
}

/**
 * Decide a player's match involvement by ranking their starting score against
 * the competitors for their position.
 */
export function decideSelection(
  playerScore: number,
  competitorScores: readonly number[],
  slotsForPosition: number,
  benchSlots: number,
): SelectionDecision {
  const better = competitorScores.filter((score) => score > playerScore).length;
  const starter = better < slotsForPosition;
  const convoked = better < slotsForPosition + benchSlots;
  const expectedMinutes = starter
    ? 90
    : convoked
      ? better < slotsForPosition + 1
        ? 25
        : 12
      : 0;

  return { starter, convoked, expectedMinutes };
}
