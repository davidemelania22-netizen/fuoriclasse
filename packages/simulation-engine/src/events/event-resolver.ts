import type {
  EventChoice,
  EventConsequence,
  GameEventDefinition,
} from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { clamp } from '../util/math';

export interface EventEffectState {
  morale: number;
  stress: number;
  happiness: number;
  mentalHealth: number;
  motivation: number;
  reputation: number;
  popularity: number;
  moneyDelta: number;
}

export function getChoice(
  definition: GameEventDefinition,
  choiceKey: string,
): EventChoice {
  const choice = definition.choices.find((c) => c.key === choiceKey);
  if (!choice) {
    throw new Error(`Event "${definition.id}" has no choice "${choiceKey}"`);
  }
  return choice;
}

/** Apply a choice's consequences to the effect state, clamping bounded fields. */
export function applyConsequence(
  state: EventEffectState,
  consequence: EventConsequence,
): EventEffectState {
  return {
    morale: clamp(state.morale + (consequence.morale ?? 0), 0, 100),
    stress: clamp(state.stress + (consequence.stress ?? 0), 0, 100),
    happiness: clamp(state.happiness + (consequence.happiness ?? 0), 0, 100),
    mentalHealth: clamp(
      state.mentalHealth + (consequence.mentalHealth ?? 0),
      0,
      100,
    ),
    motivation: clamp(state.motivation + (consequence.motivation ?? 0), 0, 100),
    reputation: clamp(
      state.reputation + (consequence.reputation ?? 0),
      0,
      10000,
    ),
    popularity: clamp(
      state.popularity + (consequence.popularity ?? 0),
      0,
      10000,
    ),
    moneyDelta: state.moneyDelta + (consequence.money ?? 0),
  };
}

const CONSEQUENCE_KEYS = [
  'morale',
  'stress',
  'happiness',
  'mentalHealth',
  'motivation',
  'reputation',
  'popularity',
  'money',
] as const;

/** Sums two consequences field by field, keeping only the keys that moved. */
export function mergeConsequences(
  base: EventConsequence,
  extra: EventConsequence,
): EventConsequence {
  const merged: EventConsequence = {};
  for (const key of CONSEQUENCE_KEYS) {
    const total = (base[key] ?? 0) + (extra[key] ?? 0);
    if (total !== 0) merged[key] = total;
  }
  return merged;
}

export interface ChoiceOutcome {
  /** null when the choice was a sure thing, no dice rolled. */
  succeeded: boolean | null;
  /** What to tell the player happened, or null for a certain choice. */
  outcomeLabel: string | null;
  /** Everything that actually applies: the choice's price plus luck's answer. */
  consequences: EventConsequence;
}

/**
 * Rolls a choice whose odds were shown to the player. A choice without a
 * gamble resolves to exactly what was promised — no hidden dice anywhere.
 */
export function resolveChoiceOutcome(
  choice: EventChoice,
  rng: RandomSource,
): ChoiceOutcome {
  if (!choice.gamble) {
    return {
      succeeded: null,
      outcomeLabel: null,
      consequences: choice.consequences,
    };
  }
  const succeeded = rng.chance(choice.gamble.successChance);
  const branch = succeeded ? choice.gamble.success : choice.gamble.failure;
  return {
    succeeded,
    outcomeLabel: succeeded
      ? choice.gamble.successLabel
      : choice.gamble.failureLabel,
    consequences: mergeConsequences(choice.consequences, branch),
  };
}
