import type {
  EventChoice,
  EventConsequence,
  GameEventDefinition,
} from '@football-life/shared';
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
