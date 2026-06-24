import type { EventContext, GameEventDefinition } from '@football-life/shared';
import { evaluateTrigger } from './trigger-evaluator';

export interface CooldownEntry {
  lastWeek: number;
  count: number;
}

export type CooldownState = Map<string, CooldownEntry>;

/**
 * An event is eligible when its trigger holds, it is off cooldown, it has not
 * exceeded its per-career cap, and no mutually-exclusive event has occurred.
 */
export function isEligible(
  definition: GameEventDefinition,
  context: EventContext,
  cooldown: CooldownState,
): boolean {
  const entry = cooldown.get(definition.id);
  if (entry) {
    if (
      definition.maxOccurrencesPerCareer !== undefined &&
      entry.count >= definition.maxOccurrencesPerCareer
    ) {
      return false;
    }
    if (context.weekIndex - entry.lastWeek < definition.cooldownWeeks) {
      return false;
    }
  }

  if (definition.mutuallyExclusiveWith) {
    for (const excludedId of definition.mutuallyExclusiveWith) {
      const excluded = cooldown.get(excludedId);
      if (excluded && excluded.count > 0) {
        return false;
      }
    }
  }

  return evaluateTrigger(definition.trigger, context);
}

export function recordOccurrence(
  cooldown: CooldownState,
  definitionId: string,
  weekIndex: number,
): CooldownState {
  const entry = cooldown.get(definitionId);
  cooldown.set(definitionId, {
    lastWeek: weekIndex,
    count: (entry?.count ?? 0) + 1,
  });
  return cooldown;
}
