import type { WellbeingConfig } from '@football-life/shared';
import { clamp, mean } from '../util/math';

export interface RelationshipState {
  affinity: number;
  trust: number;
  conflict: number;
  influence: number;
}

export type RelationshipInteraction = 'POSITIVE' | 'CONFLICT' | 'NEUTRAL';

export function applyRelationshipInteraction(
  state: RelationshipState,
  interaction: RelationshipInteraction,
  config: WellbeingConfig,
): RelationshipState {
  const r = config.relationship;
  let { affinity, trust, conflict } = state;

  if (interaction === 'POSITIVE') {
    affinity += r.positiveInteractionGain;
    trust += r.positiveInteractionGain * 0.6;
    conflict -= r.decay * 2;
  } else if (interaction === 'CONFLICT') {
    conflict += r.conflictGain;
    affinity -= r.conflictGain * 0.7;
    trust -= r.conflictGain * 0.5;
  } else {
    conflict -= r.decay;
  }

  return {
    affinity: clamp(affinity, -100, 100),
    trust: clamp(trust, 0, 100),
    conflict: clamp(conflict, 0, 100),
    influence: clamp(state.influence, 0, 100),
  };
}

/** Aggregate morale boost/penalty from the player's close relationships. */
export function relationshipMoraleModifier(
  relationships: readonly RelationshipState[],
  config: WellbeingConfig,
): number {
  if (relationships.length === 0) return 0;
  const averageAffinity = mean(relationships.map((r) => r.affinity));
  return averageAffinity * config.relationship.supportMoraleFactor;
}
