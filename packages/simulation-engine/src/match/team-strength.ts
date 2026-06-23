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
): number {
  const values = starters
    .filter((player) => positions.includes(player.position))
    .map(effectiveAbility);
  return values.length > 0 ? mean(values) : fallback;
}

export function computeTeamStrength(
  starters: readonly MatchPlayer[],
  config: MatchConfig,
): TeamStrength {
  const overall =
    starters.length > 0 ? mean(starters.map(effectiveAbility)) : 50;

  const attack = departmentMean(
    starters,
    [PlayerPosition.Forward, PlayerPosition.Winger],
    overall,
  );
  const midfield = departmentMean(
    starters,
    [PlayerPosition.Midfielder],
    overall,
  );
  const defense = departmentMean(
    starters,
    [PlayerPosition.Goalkeeper, PlayerPosition.Defender],
    overall,
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
