import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '@football-life/shared';
import { createRandomSource } from '../random/seeded-random';
import { mean } from '../util/math';
import { buildSquadPositions } from '../generation/player-generator';
import { generateDoubleRoundRobin } from '../generation/schedule-generator';
import { simulateMatch } from './match-engine';
import { simulateSeason, type SeasonFixtureInput } from './season';
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
  selectionWeights: {
    ability: 0.62,
    form: 0.2,
    condition: 0.13,
    randomness: 0.05,
  },
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

function makeSquad(clubId: string, ability: number, count = 16): MatchPlayer[] {
  return buildSquadPositions(count).map((position, index) => ({
    id: `${clubId}-p${index}`,
    position,
    currentAbility: ability,
    form: 50,
    condition: 100,
    morale: 60,
    discipline: 60,
    finishing: ability,
  }));
}

describe('simulateMatch', () => {
  it('is deterministic for the same seed', () => {
    const home = { clubId: 'H', players: makeSquad('H', 65) };
    const away = { clubId: 'A', players: makeSquad('A', 60) };
    const a = simulateMatch({
      home,
      away,
      config,
      rng: createRandomSource('m'),
    });
    const b = simulateMatch({
      home,
      away,
      config,
      rng: createRandomSource('m'),
    });
    expect(a).toEqual(b);
  });

  it('gives the home side an advantage between even teams', () => {
    const rng = createRandomSource('home-adv');
    let homeWins = 0;
    let awayWins = 0;
    const totals: number[] = [];
    const matches = 5000;
    for (let i = 0; i < matches; i += 1) {
      const result = simulateMatch({
        home: { clubId: 'H', players: makeSquad('H', 60) },
        away: { clubId: 'A', players: makeSquad('A', 60) },
        config,
        rng,
      });
      if (result.homeGoals > result.awayGoals) homeWins += 1;
      else if (result.homeGoals < result.awayGoals) awayWins += 1;
      totals.push(result.homeGoals + result.awayGoals);
    }
    expect(homeWins).toBeGreaterThan(awayWins);
    expect(homeWins / matches).toBeGreaterThan(0.36);
    expect(mean(totals)).toBeGreaterThan(2.2);
    expect(mean(totals)).toBeLessThan(3.4);
  });

  it('lets the stronger team win clearly more often (home or away)', () => {
    const rng = createRandomSource('quality');
    let strongHomeWins = 0;
    let strongAwayWins = 0;
    const matches = 2000;
    for (let i = 0; i < matches; i += 1) {
      const strongHome = simulateMatch({
        home: { clubId: 'S', players: makeSquad('S', 80) },
        away: { clubId: 'W', players: makeSquad('W', 45) },
        config,
        rng,
      });
      if (strongHome.homeGoals > strongHome.awayGoals) strongHomeWins += 1;

      const strongAway = simulateMatch({
        home: { clubId: 'W', players: makeSquad('W', 45) },
        away: { clubId: 'S', players: makeSquad('S', 80) },
        config,
        rng,
      });
      if (strongAway.awayGoals > strongAway.homeGoals) strongAwayWins += 1;
    }
    expect(strongHomeWins / matches).toBeGreaterThan(0.7);
    expect(strongAwayWins / matches).toBeGreaterThan(0.6);
  });

  it('produces ratings mostly between 5.5 and 7.5, always within [3, 10]', () => {
    const rng = createRandomSource('ratings');
    const ratings: number[] = [];
    for (let i = 0; i < 1500; i += 1) {
      const result = simulateMatch({
        home: { clubId: 'H', players: makeSquad('H', 60 + (i % 20)) },
        away: { clubId: 'A', players: makeSquad('A', 55 + (i % 25)) },
        config,
        rng,
      });
      for (const appearance of result.appearances) {
        ratings.push(appearance.rating);
        expect(appearance.rating).toBeGreaterThanOrEqual(3);
        expect(appearance.rating).toBeLessThanOrEqual(10);
      }
    }
    const within = ratings.filter((r) => r >= 5.5 && r <= 7.5).length;
    expect(within / ratings.length).toBeGreaterThan(0.55);
    expect(mean(ratings)).toBeGreaterThan(5.7);
    expect(mean(ratings)).toBeLessThan(6.7);
  });

  it('assigns goals only to players who started and never a negative score', () => {
    const result = simulateMatch({
      home: { clubId: 'H', players: makeSquad('H', 75) },
      away: { clubId: 'A', players: makeSquad('A', 50) },
      config,
      rng: createRandomSource('goals'),
    });
    const starterIds = new Set(result.appearances.map((a) => a.playerId));
    const goalScorers = result.events
      .filter((e) => e.type === 'GOAL')
      .map((e) => e.playerId);
    for (const scorer of goalScorers) {
      expect(starterIds.has(scorer)).toBe(true);
    }
    expect(result.homeGoals).toBeGreaterThanOrEqual(0);
    expect(result.awayGoals).toBeGreaterThanOrEqual(0);
  });
});

describe('simulateSeason', () => {
  it('plays every fixture and produces a consistent table', () => {
    const clubIds = ['c0', 'c1', 'c2', 'c3'];
    const squads = new Map<string, MatchPlayer[]>(
      clubIds.map((id, index) => [id, makeSquad(id, 55 + index * 5)]),
    );
    const fixtures: SeasonFixtureInput[] = generateDoubleRoundRobin(
      clubIds,
    ).map((game, index) => ({
      id: `f${index}`,
      homeClubId: game.homeClubKey,
      awayClubId: game.awayClubKey,
    }));

    const { fixtures: played, standings } = simulateSeason({
      fixtures,
      squads,
      config,
      rng: createRandomSource('season'),
    });

    expect(played).toHaveLength(12); // 4 clubs double round-robin
    expect(standings).toHaveLength(4);

    const totalPlayed = standings.reduce((sum, row) => sum + row.played, 0);
    expect(totalPlayed).toBe(24); // 12 fixtures * 2 clubs
    for (const row of standings) {
      expect(row.played).toBe(6);
    }

    const draws = played.filter(
      (f) => f.result.homeGoals === f.result.awayGoals,
    ).length;
    const totalPoints = standings.reduce((sum, row) => sum + row.points, 0);
    expect(totalPoints).toBe(3 * 12 - draws);
  });

  it('ranks the strongest club at or near the top', () => {
    const clubIds = ['weak', 'mid', 'good', 'elite'];
    const abilityByClub: Record<string, number> = {
      weak: 45,
      mid: 55,
      good: 65,
      elite: 80,
    };
    const squads = new Map<string, MatchPlayer[]>(
      clubIds.map((id) => [id, makeSquad(id, abilityByClub[id] ?? 50)]),
    );
    const fixtures: SeasonFixtureInput[] = generateDoubleRoundRobin(
      clubIds,
    ).map((game, index) => ({
      id: `f${index}`,
      homeClubId: game.homeClubKey,
      awayClubId: game.awayClubKey,
    }));
    const { standings } = simulateSeason({
      fixtures,
      squads,
      config,
      rng: createRandomSource('ranking'),
    });
    const eliteRank = standings.findIndex((row) => row.clubId === 'elite');
    expect(eliteRank).toBeLessThanOrEqual(1);
  });
});
