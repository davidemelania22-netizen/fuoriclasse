import type { EventContext, GameEventDefinition } from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import { isEligible, type CooldownState } from './cooldown-manager';

export function eligibleEvents(
  definitions: readonly GameEventDefinition[],
  context: EventContext,
  cooldown: CooldownState,
): GameEventDefinition[] {
  return definitions.filter((definition) =>
    isEligible(definition, context, cooldown),
  );
}

/**
 * Weighted, variety-aware selection of one eligible event. An event's effective
 * weight shrinks with each past occurrence to keep the stream varied.
 */
export function selectEvent(
  definitions: readonly GameEventDefinition[],
  context: EventContext,
  cooldown: CooldownState,
  rng: RandomSource,
): GameEventDefinition | null {
  const eligible = eligibleEvents(definitions, context, cooldown);
  if (eligible.length === 0) {
    return null;
  }

  const weighted = eligible.map((definition) => {
    const count = cooldown.get(definition.id)?.count ?? 0;
    return { value: definition, weight: definition.weight / (1 + count) };
  });
  return rng.weightedPick(weighted);
}
