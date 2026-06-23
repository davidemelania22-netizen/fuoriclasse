import {
  PlayerPosition,
  type Formation,
  type MatchConfig,
} from '@football-life/shared';
import type { RandomSource } from '../random/random-source';
import type { MatchPlayer } from './types';

function selectionScore(
  player: MatchPlayer,
  config: MatchConfig,
  rng: RandomSource,
): number {
  const w = config.selectionWeights;
  return (
    player.currentAbility * w.ability +
    player.form * w.form +
    player.condition * w.condition +
    rng.next() * 100 * w.randomness
  );
}

/**
 * SelectionAI: pick the strongest available XI for the formation, preferring
 * natural positions and back-filling remaining slots with the best left over.
 */
export function selectLineup(
  players: readonly MatchPlayer[],
  formation: Formation,
  config: MatchConfig,
  rng: RandomSource,
): MatchPlayer[] {
  const scored = players.map((player) => ({
    player,
    score: selectionScore(player, config, rng),
  }));
  const used = new Set<string>();
  const starters: MatchPlayer[] = [];

  const needs: [PlayerPosition, number][] = [
    [PlayerPosition.Goalkeeper, formation.GK],
    [PlayerPosition.Defender, formation.DF],
    [PlayerPosition.Midfielder, formation.MF],
    [PlayerPosition.Winger, formation.WG],
    [PlayerPosition.Forward, formation.FW],
  ];

  for (const [position, count] of needs) {
    const candidates = scored
      .filter(
        (entry) =>
          !used.has(entry.player.id) && entry.player.position === position,
      )
      .sort((a, b) => b.score - a.score);
    for (let i = 0; i < count && i < candidates.length; i += 1) {
      const chosen = candidates[i]!;
      starters.push(chosen.player);
      used.add(chosen.player.id);
    }
  }

  const remaining = 11 - starters.length;
  if (remaining > 0) {
    const rest = scored
      .filter((entry) => !used.has(entry.player.id))
      .sort((a, b) => b.score - a.score);
    for (let i = 0; i < remaining && i < rest.length; i += 1) {
      const chosen = rest[i]!;
      starters.push(chosen.player);
      used.add(chosen.player.id);
    }
  }

  return starters;
}
