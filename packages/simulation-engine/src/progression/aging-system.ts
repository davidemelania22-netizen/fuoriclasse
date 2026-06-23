import {
  AttributeCategory,
  type ProgressionConfig,
} from '@football-life/shared';
import { clamp, mean } from '../util/math';
import type { AttributeChange, PlayerProgressState } from './types';

export interface SeasonalAgingParams {
  player: PlayerProgressState;
  /** The player's age at the start of the new season. */
  age: number;
  config: ProgressionConfig;
}

export interface SeasonalAgingResult {
  player: PlayerProgressState;
  abilityDelta: number;
  changedAttributes: AttributeChange[];
}

/**
 * Apply one season's physical decay (older players) and modest late-career
 * mental growth (experience). Decay hits pace/acceleration hardest and
 * technique/mentals least, per design.
 */
export function applySeasonalAging(
  params: SeasonalAgingParams,
): SeasonalAgingResult {
  const { player, age, config } = params;
  const decay = config.decay;
  const yearsOver = Math.max(0, age - decay.startAge + 1);
  const accelerationFactor = yearsOver > 0 ? 1 + (yearsOver - 1) * 0.3 : 0;

  const changedAttributes: AttributeChange[] = [];

  const nextAttributes = player.attributes.map((attribute) => {
    if (attribute.category === AttributeCategory.Hidden) {
      return attribute;
    }

    let delta = 0;

    if (age >= decay.startAge) {
      const multiplier =
        decay.attributeMultipliers[attribute.key] ?? decay.defaultMultiplier;
      delta -= decay.basePerYear * multiplier * accelerationFactor;
    }

    if (
      attribute.category === AttributeCategory.Mental &&
      age >= decay.mentalGrowthStartAge
    ) {
      delta += decay.mentalGrowthPerYear;
    }

    if (delta === 0) {
      return attribute;
    }

    const after = clamp(attribute.value + delta, 1, 99);
    if (after !== attribute.value) {
      changedAttributes.push({
        key: attribute.key,
        before: attribute.value,
        after,
      });
    }
    return { ...attribute, value: after };
  });

  const nextCurrentAbility = mean(
    nextAttributes
      .filter((a) => a.category !== AttributeCategory.Hidden)
      .map((a) => a.value),
  );

  return {
    player: {
      ...player,
      attributes: nextAttributes,
      currentAbility: nextCurrentAbility,
    },
    abilityDelta: nextCurrentAbility - player.currentAbility,
    changedAttributes,
  };
}
