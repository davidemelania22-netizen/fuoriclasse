import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaSeasonRepository } from '../repositories/prisma-season-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { simulateSeasonForSave } from './simulate-season';

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
  ability: {
    topDivisionMean: 60,
    divisionStep: 12,
    spread: 9,
    min: 20,
    max: 95,
  },
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
  name: 'Season Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

describe('simulateSeasonForSave', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it('simulates a full season, persisting scores, appearances and standings', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const seasonRepo = new PrismaSeasonRepository(db.prisma);

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

    const season = await db.prisma.season.findFirst({
      where: { saveGameId: game.save.id },
    });
    expect(season).not.toBeNull();

    const summary = await simulateSeasonForSave(
      { repository: seasonRepo, config: DEFAULT_MATCH_CONFIG },
      { seasonId: season!.id },
    );

    expect(summary?.fixturesPlayed).toBe(12); // 4 clubs double round-robin
    expect(summary?.totalGoals).toBeGreaterThan(0);
    expect(summary?.leaderClubId).not.toBeNull();

    // Every fixture is played and scored.
    const remaining = await db.prisma.fixture.count({
      where: { seasonId: season!.id, status: 'SCHEDULED' },
    });
    expect(remaining).toBe(0);
    const played = await db.prisma.fixture.findMany({
      where: { seasonId: season!.id },
    });
    expect(played).toHaveLength(12);
    for (const fixture of played) {
      expect(fixture.homeScore).not.toBeNull();
      expect(fixture.awayScore).not.toBeNull();
    }

    // Two full XIs per match were recorded.
    const appearances = await db.prisma.matchAppearance.count();
    expect(appearances).toBe(12 * 22);

    // Standings are consistent.
    const standings = await db.prisma.standing.findMany({
      where: { seasonId: season!.id },
    });
    const totalPlayed = standings.reduce((sum, row) => sum + row.played, 0);
    expect(totalPlayed).toBe(24);
    for (const row of standings) {
      expect(row.played).toBe(6);
    }

    const updatedSeason = await db.prisma.season.findUnique({
      where: { id: season!.id },
    });
    expect(updatedSeason?.status).toBe('COMPLETED');
  });

  it('returns zero fixtures when the season has nothing left to play', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const seasonRepo = new PrismaSeasonRepository(db.prisma);

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
    const season = await db.prisma.season.findFirst({
      where: { saveGameId: game.save.id },
    });

    await simulateSeasonForSave(
      { repository: seasonRepo, config: DEFAULT_MATCH_CONFIG },
      { seasonId: season!.id },
    );
    const second = await simulateSeasonForSave(
      { repository: seasonRepo, config: DEFAULT_MATCH_CONFIG },
      { seasonId: season!.id },
    );
    expect(second?.fixturesPlayed).toBe(0);
  });
});
