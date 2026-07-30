import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaMatchdayRepository } from '../repositories/prisma-matchday-repository';
import { PrismaCareerStatsRepository } from '../repositories/prisma-career-stats-repository';
import { PrismaCareerTimelineRepository } from '../repositories/prisma-career-timeline-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { simulateDueMatchdays } from './simulate-matchday';
import { getCareerLegacy, getSeasonStats } from './career-legacy';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 4,
  clubsPerSecondDivision: 0,
  rosterSize: 14,
  age: { min: 16, max: 36, mean: 24, spread: 4 },
  ability: { topDivisionMean: 60, divisionStep: 12, spread: 9, min: 20, max: 95 },
  reputation: { topDivision: 3000, secondDivision: 1200, youth: 400 },
  namePools: {
    IT: {
      firstNames: ['Marco', 'Luca', 'Matteo', 'Andrea', 'Davide'],
      lastNames: ['Rossi', 'Bianchi', 'Esposito', 'Romano', 'Colombo'],
      cities: ['Milano', 'Torino', 'Roma', 'Napoli', 'Firenze'],
    },
  },
};

const newGame: NewGameInput = {
  name: 'Career Legacy Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('career legacy', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('aggregates season stats from real appearances and grades the career', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    await generateAndPersistWorld(
      { worldRepository: worldRepo },
      {
        saveGameId: game.save.id,
        seed: game.save.seed,
        countries,
        config: worldConfig,
      },
    );

    // Guarantee the protagonist starts every match.
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id, currentAbility: 99, careerStatus: 'ACTIVE' },
    });

    const statsRepo = new PrismaCareerStatsRepository(db.prisma);
    const legacyDeps = {
      stats: statsRepo,
      timeline: new PrismaCareerTimelineRepository(db.prisma),
    };

    // Fresh career: empty stats, "Meteora" grade.
    expect(await getSeasonStats(statsRepo, game.save.id)).toEqual([]);
    const emptyLegacy = await getCareerLegacy(legacyDeps, game.save.id);
    expect(emptyLegacy!.totals.appearances).toBe(0);
    expect(emptyLegacy!.grade.key).toBe('METEORA');
    expect(emptyLegacy!.isRetired).toBe(false);

    // Play two real matchdays.
    const seasonStart = new Date(worldConfig.seasonStart);
    await simulateDueMatchdays(
      { repository: new PrismaMatchdayRepository(db.prisma), config: DEFAULT_MATCH_CONFIG },
      {
        saveGameId: game.save.id,
        fromDate: new Date(seasonStart.getTime() - 86_400_000),
        toDate: new Date(seasonStart.getTime() + 7 * 86_400_000),
      },
    );

    const rows = await getSeasonStats(statsRepo, game.save.id);
    expect(rows).toHaveLength(1); // one season
    const row = rows![0]!;
    expect(row.appearances).toBe(2);
    expect(row.clubName).toBe(club.name);
    expect(row.averageRating).toBeGreaterThan(0);

    const legacy = await getCareerLegacy(legacyDeps, game.save.id);
    expect(legacy!.totals.appearances).toBe(2);
    expect(legacy!.bestSeason?.seasonLabel).toBe(row.seasonLabel);
    expect(legacy!.playerName).toBe('Test Player');
  });
});
