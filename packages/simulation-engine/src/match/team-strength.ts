import { PlayerPosition, type MatchConfig } from '@football-life/shared';
import { mean } from '../util/math';
import type { MatchPlayer, TeamStrength } from './types';

/** Ability adjusted by condition, form and morale. */
export function effectiveAbility(player: MatchPlayer): number {
  const conditionFactor = 0.8 + 0.2 * (player.condition / 100);
  const formFactor = 0.9 + 0.2 * (player.form / 100);
  const moraleFactor = 0.95 + 0.1 * (player.morale / 100);
  return player.currentAbility * conditionFactor * formFactor * moraleFactor;
}

function departmentMean(
  starters: readonly MatchPlayer[],
  positions: readonly PlayerPosition[],
  fallback: number,
  config: MatchConfig,
): number {
  const values = starters
    .filter((player) => positions.includes(player.position))
    .map(effectiveAbility);
  return values.length > 0 ? squadLevel(values, config) : fallback;
}

/**
 * A side's level, counting its best players for more than one eleventh.
 *
 * The flat average of eleven players says a world-class forward in an ordinary
 * team is worth about four rating points — which is why, before this, being
 * outstanding changed almost nothing. Blending in the mean of the best few
 * lets a great player drag his team up the way one actually does, without
 * letting him replace the other ten.
 */
function squadLevel(values: readonly number[], config: MatchConfig): number {
  if (values.length === 0) return 50;
  const flat = mean(values);
  const { starWeight, starShare } = config.individual;
  if (starWeight <= 0 || starShare <= 0) return flat;
  const count = Math.max(1, Math.round(values.length * starShare));
  if (count >= values.length) return flat;
  const best = [...values].sort((a, b) => b - a).slice(0, count);
  return flat * (1 - starWeight) + mean(best) * starWeight;
}

export function computeTeamStrength(
  starters: readonly MatchPlayer[],
  config: MatchConfig,
): TeamStrength {
  const overall = squadLevel(starters.map(effectiveAbility), config);

  const attack = departmentMean(
    starters,
    [PlayerPosition.Forward, PlayerPosition.Winger],
    overall,
    config,
  );
  const midfield = departmentMean(
    starters,
    [PlayerPosition.Midfielder],
    overall,
    config,
  );
  const defense = departmentMean(
    starters,
    [PlayerPosition.Goalkeeper, PlayerPosition.Defender],
    overall,
    config,
  );

  const weights = config.departmentWeights;
  return {
    attack,
    midfield,
    defense,
    attackingPower: attack * weights.attack + midfield * weights.midfield,
    defensivePower: defense * weights.defense + midfield * weights.midfield,
  };
}
