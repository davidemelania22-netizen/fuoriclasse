import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '@football-life/shared';
import { createRandomSource } from '../random/seeded-random';
import { buildSquadPositions } from '../generation/player-generator';
import { simulateMatch } from './match-engine';
import { biasesFor, DEFAULT_INSTRUCTIONS } from './instructions';
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

function makeSquad(clubId: string, biased?: Partial<MatchPlayer>): MatchPlayer[] {
  return buildSquadPositions(14).map((position, index) => ({
    id: `${clubId}-p${index}`,
    position,
    currentAbility: 60,
    form: 50,
    condition: 100,
    morale: 60,
    discipline: 60,
    finishing: 60,
    // The tested player is the first forward in the squad.
    ...(position === 'FW' && index >= 10 && biased ? biased : {}),
  }));
}

describe('biasesFor', () => {
  it('maps the two axes onto multiplicative engine biases', () => {
    const shootAggressive = biasesFor({ style: 'SHOOT', temperament: 'AGGRESSIVE' });
    expect(shootAggressive.goalBias).toBeCloseTo(1.6 * 1.1);
    expect(shootAggressive.assistBias).toBeCloseTo(0.7 * 1.1);
    expect(shootAggressive.cardBias).toBe(1.6);

    const neutral = biasesFor(DEFAULT_INSTRUCTIONS);
    expect(neutral).toEqual({ goalBias: 1, assistBias: 1, cardBias: 1 });

    const createDisciplined = biasesFor({ style: 'CREATE', temperament: 'DISCIPLINED' });
    expect(createDisciplined.goalBias).toBeCloseTo(0.7 * 0.95);
    expect(createDisciplined.assistBias).toBeCloseTo(1.6 * 0.95);
    expect(createDisciplined.cardBias).toBe(0.6);
  });
});

describe('instruction biases inside the match engine', () => {
  function tally(biased: Partial<MatchPlayer> | undefined, seedPrefix: string) {
    let goals = 0;
    let assists = 0;
    let yellows = 0;
    const targetIds = new Set<string>();
    for (let i = 0; i < 600; i += 1) {
      const home = makeSquad('H', biased);
      for (const p of home) {
        if (p.goalBias !== undefined || biased === undefined) {
          if (p.position === 'FW') targetIds.add(p.id);
        }
      }
      const result = simulateMatch({
        home: { clubId: 'H', players: home },
        away: { clubId: 'A', players: makeSquad('A') },
        config,
        rng: createRandomSource(`${seedPrefix}:${i}`),
      });
      for (const a of result.appearances) {
        if (a.clubId !== 'H' || a.position !== 'FW') continue;
        goals += a.goals;
        assists += a.assists;
        yellows += a.yellowCards;
      }
    }
    return { goals, assists, yellows };
  }

  it('a striker told to shoot scores more and assists less than a creator', () => {
    const shooter = tally({ goalBias: 1.6, assistBias: 0.7 }, 'bias');
    const creator = tally({ goalBias: 0.7, assistBias: 1.6 }, 'bias');
    expect(shooter.goals).toBeGreaterThan(creator.goals);
    expect(creator.assists).toBeGreaterThan(shooter.assists);
  });

  it('a disciplined player collects fewer yellow cards than an aggressive one', () => {
    const aggressive = tally({ cardBias: 1.6 }, 'cards');
    const disciplined = tally({ cardBias: 0.6 }, 'cards');
    expect(disciplined.yellows).toBeLessThan(aggressive.yellows);
  });
});
