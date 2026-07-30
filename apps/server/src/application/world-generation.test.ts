import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

const config: WorldGenerationConfig = {
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
  name: 'World Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

describe('world generation and persistence', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it('persists a generated world under a save game with correct counts', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);

    const game = await createNewGame({ repository: saveRepo }, newGame);
    const summary = await generateAndPersistWorld(
      { worldRepository: worldRepo },
      {
        saveGameId: game.save.id,
        seed: game.save.seed,
        countries,
        config,
      },
    );

    expect(summary.clubs).toBe(4);
    expect(summary.players).toBe(4 * 14);
    expect(summary.coaches).toBe(4);
    expect(summary.competitions).toBe(5); // youth + national cup + tier 1 + continental + national-team tournament
    expect(summary.seasons).toBe(1);
    expect(summary.fixtures).toBe(4 * 3); // double round-robin of 4 clubs
    expect(summary.standings).toBe(4);

    // Database reflects the summary.
    expect(
      await db.prisma.club.count({ where: { saveGameId: game.save.id } }),
    ).toBe(4);
    expect(
      await db.prisma.player.count({ where: { saveGameId: game.save.id } }),
    ).toBe(4 * 14 + 1); // synthetic squads + the protagonist created earlier
    expect(
      await db.prisma.fixture.count({ where: { saveGameId: game.save.id } }),
    ).toBe(12);

    // Referential integrity: every fixture points at real clubs.
    const fixture = await db.prisma.fixture.findFirst({
      where: { saveGameId: game.save.id },
      include: { homeClub: true, awayClub: true },
    });
    expect(fixture?.homeClub).not.toBeNull();
    expect(fixture?.awayClub).not.toBeNull();
    expect(fixture?.homeClubId).not.toBe(fixture?.awayClubId);
  });

  it('cascade-deletes the whole world when the save is removed', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);

    const game = await createNewGame({ repository: saveRepo }, newGame);
    await generateAndPersistWorld(
      { worldRepository: worldRepo },
      { saveGameId: game.save.id, seed: 'another-seed', countries, config },
    );

    // Soft delete hides it; the background purge removes the world's rows.
    await saveRepo.deleteSave(game.save.id);
    await saveRepo.purgeDeletedSaves();

    expect(
      await db.prisma.club.count({ where: { saveGameId: game.save.id } }),
    ).toBe(0);
    expect(
      await db.prisma.fixture.count({ where: { saveGameId: game.save.id } }),
    ).toBe(0);
    expect(
      await db.prisma.standing.count({
        where: { season: { saveGameId: game.save.id } },
      }),
    ).toBe(0);
  });
});
