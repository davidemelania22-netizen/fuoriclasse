import { describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  WorldGenerationConfig,
} from '@football-life/shared';
import { generateWorld, type WorldGenerationInput } from './world-generator';
import { mean } from '../util/math';

const namePool = {
  firstNames: ['Aaa', 'Bbb', 'Ccc', 'Ddd', 'Eee', 'Fff', 'Ggg', 'Hhh'],
  lastNames: ['Lan', 'Mor', 'Nor', 'Oor', 'Por', 'Qor', 'Ror', 'Sor'],
  cities: [
    'Cityone',
    'Citytwo',
    'Citythree',
    'Cityfour',
    'Cityfive',
    'Citysix',
    'Cityseven',
    'Cityeight',
  ],
};

const countries: CountryRecord[] = [
  { id: 'AA', code: 'AA', name: 'Alpha', reputation: 80 },
  { id: 'BB', code: 'BB', name: 'Beta', reputation: 70 },
];

const config: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 6,
  clubsPerSecondDivision: 4,
  rosterSize: 16,
  age: { min: 16, max: 36, mean: 24, spread: 4 },
  ability: {
    topDivisionMean: 62,
    divisionStep: 12,
    spread: 9,
    min: 20,
    max: 95,
  },
  reputation: { topDivision: 3000, secondDivision: 1200, youth: 400 },
  namePools: { AA: namePool, BB: namePool },
};

const input: WorldGenerationInput = { seed: 'world-seed', countries, config };

describe('generateWorld', () => {
  it('is fully deterministic: same seed yields an identical world', () => {
    expect(generateWorld(input)).toEqual(generateWorld(input));
  });

  it('different seeds yield different worlds', () => {
    const a = generateWorld({ ...input, seed: 'seed-a' });
    const b = generateWorld({ ...input, seed: 'seed-b' });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('produces the expected entity counts', () => {
    const world = generateWorld(input);
    // 2 countries x (6 + 4) clubs
    expect(world.clubs).toHaveLength(20);
    expect(world.coaches).toHaveLength(20);
    expect(world.players).toHaveLength(20 * 16);
    // per country: youth + national cup + tier1 + tier2, plus continental cup + national-team tournament
    expect(world.competitions).toHaveLength(2 * 4 + 2);
    expect(world.seasons).toHaveLength(2 * 2);
  });

  it('gives every club a full squad with at least two goalkeepers', () => {
    const world = generateWorld(input);
    const byClub = new Map<string, typeof world.players>();
    for (const player of world.players) {
      const list = byClub.get(player.clubKey) ?? [];
      list.push(player);
      byClub.set(player.clubKey, list);
    }
    expect(byClub.size).toBe(20);
    for (const squad of byClub.values()) {
      expect(squad).toHaveLength(16);
      const keepers = squad.filter((p) => p.primaryPosition === 'GK');
      expect(keepers.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps ages and abilities within configured bounds', () => {
    const world = generateWorld(input);
    const ages = world.players.map((p) => 2024 - p.birthDate.getUTCFullYear());
    for (const age of ages) {
      expect(age).toBeGreaterThanOrEqual(config.age.min);
      expect(age).toBeLessThanOrEqual(config.age.max);
    }
    expect(mean(ages)).toBeGreaterThan(22);
    expect(mean(ages)).toBeLessThan(26);

    for (const player of world.players) {
      expect(player.currentAbility).toBeGreaterThanOrEqual(config.ability.min);
      expect(player.currentAbility).toBeLessThanOrEqual(config.ability.max);
      expect(player.potentialAbility).toBeGreaterThanOrEqual(
        player.currentAbility,
      );
    }
  });

  it('builds a conflict-free double round-robin schedule', () => {
    const world = generateWorld(input);
    const seasonKey = 'season-comp-AA-t1';
    const fixtures = world.fixtures.filter((f) => f.seasonKey === seasonKey);

    // 6 clubs double round-robin => 6 * 5 = 30 games, 10 matchdays of 3.
    expect(fixtures).toHaveLength(30);

    const byMatchday = new Map<number, string[]>();
    const pairCounts = new Map<string, number>();
    for (const fixture of fixtures) {
      const clubs = byMatchday.get(fixture.matchday) ?? [];
      clubs.push(fixture.homeClubKey, fixture.awayClubKey);
      byMatchday.set(fixture.matchday, clubs);

      const pair = [fixture.homeClubKey, fixture.awayClubKey].sort().join('|');
      pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
    }

    expect(byMatchday.size).toBe(10);
    for (const clubs of byMatchday.values()) {
      expect(clubs).toHaveLength(6);
      expect(new Set(clubs).size).toBe(6); // no club twice in a matchday
    }
    // every pair meets exactly twice
    expect(pairCounts.size).toBe((6 * 5) / 2);
    for (const count of pairCounts.values()) {
      expect(count).toBe(2);
    }
  });

  it('featured club names claim their division slots', () => {
    const world = generateWorld({
      ...input,
      config: {
        ...config,
        namePools: {
          AA: {
            ...namePool,
            featuredClubs: ['Inter', 'Stella Rossa'],
            secondDivisionClubs: ['Palermo', 'Sampdoria'],
          },
          BB: namePool,
        },
      },
    });
    const topAA = world.clubs.filter(
      (club) => club.competitionKey === 'comp-AA-t1',
    );
    expect(topAA.map((club) => club.name)).toContain('Inter');
    expect(topAA.map((club) => club.name)).toContain('Stella Rossa');
    const inter = topAA.find((club) => club.name === 'Inter')!;
    expect(inter.shortName).toBe('INT');
    const secondAA = world.clubs.filter(
      (club) => club.competitionKey === 'comp-AA-t2',
    );
    expect(secondAA.map((club) => club.name)).toContain('Palermo');
    expect(secondAA.map((club) => club.name)).toContain('Sampdoria');
    // Forced names never leak into the other division or country.
    expect(
      world.clubs.filter(
        (club) => club.competitionKey !== 'comp-AA-t1' && club.name === 'Inter',
      ),
    ).toHaveLength(0);
    expect(
      world.clubs.filter(
        (club) =>
          club.competitionKey !== 'comp-AA-t2' && club.name === 'Palermo',
      ),
    ).toHaveLength(0);
  });

  it('the default world has no duplicate club names within a country', () => {
    const world = generateWorld(input);
    for (const country of countries) {
      const names = world.clubs
        .filter((club) => club.countryId === country.id)
        .map((club) => club.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
