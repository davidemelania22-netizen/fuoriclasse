import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { SeasonStatus } from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaContinentalRepository } from '../repositories/prisma-continental-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { getContinental, simulateContinental } from './continental';

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
  name: 'Continental Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'MF',
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
  return game.save.id;
}

describe('continental competition', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it('simulates among top clubs by reputation when no season has completed yet', async () => {
    const saveGameId = await setupWorld(db);
    const repo = new PrismaContinentalRepository(db.prisma);

    const summaryBefore = await getContinental(repo, saveGameId);
    expect(summaryBefore?.name).toBe('Coppa Continentale');
    expect(summaryBefore?.holderClubName).toBeNull();

    const result = await simulateContinental(
      {
        repository: repo,
        config: DEFAULT_MATCH_CONFIG,
        qualifiersPerCountry: 2,
      },
      { saveGameId },
    );

    expect(result).not.toBeNull();
    expect(result!.championName).toBeTruthy();
    expect(result!.roundsCount).toBeGreaterThanOrEqual(1);

    const honour = await db.prisma.honour.findFirst({
      where: { saveGameId, type: 'CONTINENTAL_CUP' },
    });
    expect(honour).not.toBeNull();
    expect(honour!.clubName).toBe(result!.championName);
  });

  it("qualifies the top clubs from each country's last completed season standings, not just reputation", async () => {
    const saveGameId = await setupWorld(db);
    const repo = new PrismaContinentalRepository(db.prisma);

    const italianTopLeague = await db.prisma.competition.findFirstOrThrow({
      where: { saveGameId, countryId: 'IT', type: 'LEAGUE', tier: 1 },
    });
    const italianClubs = await db.prisma.club.findMany({
      where: { competitionId: italianTopLeague.id },
      orderBy: { reputation: 'asc' },
    });
    // Pick the two LOWEST-reputation Italian clubs and make them the season's
    // top standings — the continental qualifiers should follow the table,
    // not fall back to reputation.
    const expectedQualifiers = italianClubs.slice(0, 2).map((c) => c.id);

    const season = await db.prisma.season.create({
      data: {
        saveGameId,
        competitionId: italianTopLeague.id,
        label: '2023/24',
        startDate: new Date('2023-08-01'),
        endDate: new Date('2024-05-01'),
        status: SeasonStatus.Completed,
      },
    });
    for (const [i, club] of italianClubs.entries()) {
      const isTop = expectedQualifiers.includes(club.id);
      await db.prisma.standing.create({
        data: {
          seasonId: season.id,
          clubId: club.id,
          played: 10,
          won: isTop ? 9 : 0,
          drawn: 0,
          lost: isTop ? 1 : 9,
          goalsFor: isTop ? 20 : 5,
          goalsAgainst: isTop ? 5 : 20,
          points: isTop ? 27 - i : 0,
        },
      });
    }

    const field = await repo.loadField(saveGameId, 2);
    expect(field).not.toBeNull();

    const italianEntrantsInField = field!.entrants.filter((id) =>
      italianClubs.some((c) => c.id === id),
    );
    expect(new Set(italianEntrantsInField)).toEqual(
      new Set(expectedQualifiers),
    );
  });
});
