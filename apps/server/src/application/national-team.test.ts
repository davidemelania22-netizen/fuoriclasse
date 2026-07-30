import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaNationalTeamRepository } from '../repositories/prisma-national-team-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import {
  getNationalTeamTournament,
  simulateNationalTeamTournament,
} from './national-team';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
  { id: 'ES', code: 'ES', name: 'Spagna', reputation: 85 },
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
    ES: {
      firstNames: ['Javier', 'Carlos', 'Diego', 'Pablo', 'Sergio'],
      lastNames: ['Garcia', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez'],
      cities: ['Madrid', 'Valencia', 'Sevilla', 'Bilbao', 'Malaga'],
    },
  },
};

const newGame: NewGameInput = {
  name: 'National Team Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

async function setupWorld(db: TestDatabase) {
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
  return { saveGameId: game.save.id, playerId: game.player.id };
}

describe('national team tournament', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it('simulates a tournament among national squads and records an honour', async () => {
    const { saveGameId } = await setupWorld(db);
    const repo = new PrismaNationalTeamRepository(db.prisma);

    const summary = await getNationalTeamTournament(repo, saveGameId);
    expect(summary?.name).toBe('Europei');
    expect(summary?.holderCountryName).toBeNull();

    const result = await simulateNationalTeamTournament(
      { repository: repo, config: DEFAULT_MATCH_CONFIG, squadSize: 20 },
      { saveGameId },
    );

    expect(result).not.toBeNull();
    expect(result!.championName).toBeTruthy();

    const honour = await db.prisma.honour.findFirst({
      where: { saveGameId, type: 'INTERNATIONAL' },
    });
    expect(honour).not.toBeNull();
    expect(honour!.clubName).toBe(result!.championName);
  });

  it('calls up the protagonist when their ability tops their nationality, and benches them otherwise', async () => {
    const { saveGameId, playerId } = await setupWorld(db);
    const repo = new PrismaNationalTeamRepository(db.prisma);

    await db.prisma.player.update({
      where: { id: playerId },
      data: { currentAbility: 99, form: 99 },
    });
    const called = await repo.loadField(saveGameId, 20);
    expect(called?.protagonistCountryId).toBe('IT');

    await db.prisma.player.update({
      where: { id: playerId },
      data: { currentAbility: 1, form: 1 },
    });
    const benched = await repo.loadField(saveGameId, 20);
    expect(benched?.protagonistCountryId).toBeNull();
  });
});
