import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaNpcAgingRepository } from '../repositories/prisma-npc-aging-repository';
import { PrismaYouthIntakeRepository } from '../repositories/prisma-youth-intake-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { runYouthIntake } from './youth-intake';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 4,
  clubsPerSecondDivision: 0,
  rosterSize: 12,
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
  name: 'Intake Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('youth intake day', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('graduates teenagers into every club and reports the protagonist class', async () => {
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
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id, careerStatus: 'ACTIVE' },
    });

    const before = await db.prisma.player.count({
      where: { saveGameId: game.save.id, clubId: { not: null } },
    });

    const deps = {
      intake: new PrismaYouthIntakeRepository(db.prisma),
      aging: new PrismaNpcAgingRepository(db.prisma),
      worldConfig,
    };
    const result = await runYouthIntake(deps, {
      saveGameId: game.save.id,
      seasonLabel: '2025/2026',
    });

    // Every club graduates 1-3 kids (4 clubs → between 4 and 12 in total).
    expect(result.totalGraduates).toBeGreaterThanOrEqual(4);
    expect(result.totalGraduates).toBeLessThanOrEqual(12);
    const after = await db.prisma.player.count({
      where: { saveGameId: game.save.id, clubId: { not: null } },
    });
    expect(after).toBe(before + result.totalGraduates);

    // Graduates are teenagers (intake age band 15-18).
    const newest = await db.prisma.player.findMany({
      where: { saveGameId: game.save.id, clubId: { not: null } },
      include: { person: true },
      orderBy: { id: 'asc' },
    });
    const currentDate = (await db.prisma.saveGame.findUniqueOrThrow({
      where: { id: game.save.id },
    })).currentDate;
    const kids = newest.filter(
      (p) =>
        currentDate.getTime() - p.person.birthDate.getTime() <
        19 * 365.25 * 86_400_000,
    );
    expect(kids.length).toBeGreaterThanOrEqual(result.totalGraduates);

    // The protagonist's club class is reported and the news are built.
    expect(result.myClubGraduates.length).toBeGreaterThanOrEqual(1);
    expect(result.news.length).toBeGreaterThanOrEqual(2);
    expect(result.news[0]!.category).toBe('YOUTH');
    expect(
      result.news.some((n) => n.headline.includes(club.name)),
    ).toBe(true);
    // The same-position flag matches the data.
    for (const kid of result.myClubGraduates) {
      expect(kid.rivalOfProtagonist).toBe(kid.position === 'FW');
    }

    // Determinism: same seasonLabel would regenerate the same class, so a
    // different label produces a (very likely) different one.
    const again = await runYouthIntake(deps, {
      saveGameId: game.save.id,
      seasonLabel: '2026/2027',
    });
    expect(again.totalGraduates).toBeGreaterThanOrEqual(4);
  });

  it('is a no-op for a save with no world', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    const deps = {
      intake: new PrismaYouthIntakeRepository(db.prisma),
      aging: new PrismaNpcAgingRepository(db.prisma),
      worldConfig,
    };
    const result = await runYouthIntake(deps, {
      saveGameId: game.save.id,
      seasonLabel: '2025/2026',
    });
    expect(result.totalGraduates).toBe(0);
    expect(result.news).toEqual([]);
  });
});
