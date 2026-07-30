import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '@football-life/shared';
import { createRandomSource } from '../random/seeded-random';
import { buildSquadPositions } from '../generation/player-generator';
import { selectLineup } from './selection';
import type { MatchPlayer } from './types';

const config: MatchConfig = {
  baseGoals: 1.35,
  homeAdvantage: 6,
  strengthSpread: 30,
  minXg: 0.2,
  maxXg: 4.5,
  assistProbability: 0.72,
  formation: { GK: 1, DF: 4, MF: 3, WG: 2, FW: 1 },
  departmentWeights: { attack: 0.6, midfield: 0.4, defense: 0.6 },
  selectionWeights: { ability: 0.62, form: 0.2, condition: 0.13, randomness: 0.05 },
  rating: {
    base: 6.1,
    noise: 0.5,
    winBonus: 0.4,
    drawBonus: 0.0,
    lossPenalty: -0.4,
    goalBonus: 0.85,
    assistBonus: 0.45,
    concededPenalty: 0.22,
    min: 3,
    max: 10,
  },
  cards: { baseYellow: 0.14, baseRed: 0.012, disciplineFactor: 0.8 },
};

function makeSquad(count = 16): MatchPlayer[] {
  return buildSquadPositions(count).map((position, index) => ({
    id: `p${index}`,
    position,
    currentAbility: 60,
    form: 50,
    condition: 100,
    morale: 60,
    discipline: 60,
    finishing: 60,
  }));
}

describe('selectLineup', () => {
  it('picks 11 starters from an available squad', () => {
    const xi = selectLineup(
      makeSquad(),
      config.formation,
      config,
      createRandomSource('sel'),
    );
    expect(xi).toHaveLength(11);
  });

  it('never fields a player marked unavailable', () => {
    const squad = makeSquad();
    // Mark the strongest possible candidate (huge ability) unavailable — it
    // must still be excluded despite a selection score that would top the list.
    squad[3] = { ...squad[3]!, currentAbility: 999, available: false };
    const chosenIds = new Set(
      selectLineup(
        squad,
        config.formation,
        config,
        createRandomSource('sel'),
      ).map((p) => p.id),
    );
    expect(chosenIds.has(squad[3]!.id)).toBe(false);
  });

  it('treats undefined availability as available', () => {
    // makeSquad leaves `available` unset, so every player defaults to eligible.
    const xi = selectLineup(
      makeSquad(),
      config.formation,
      config,
      createRandomSource('sel'),
    );
    expect(xi).toHaveLength(11);
  });
});
