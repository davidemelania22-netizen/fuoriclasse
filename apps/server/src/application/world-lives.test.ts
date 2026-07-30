import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaMatchdayRepository } from '../repositories/prisma-matchday-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaStandingsRepository } from '../repositories/prisma-standings-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { simulateDueMatchdays } from './simulate-matchday';
import { getStandings } from './standings';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

// Two divisions => two leagues, only one of which contains the protagonist.
const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 4,
  clubsPerSecondDivision: 4,
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
  name: 'World Lives Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('the world simulates around the protagonist', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it("plays every league on the matchday, not just the protagonist's", async () => {
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

    const leagues = await db.prisma.competition.findMany({
      where: { saveGameId: game.save.id, type: 'LEAGUE' },
      orderBy: { tier: 'asc' },
    });
    expect(leagues.length).toBe(2);
    const [topLeague, secondLeague] = leagues;

    const protagonistClub = await db.prisma.club.findFirstOrThrow({
      where: { competitionId: topLeague!.id },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: protagonistClub.id },
    });

    const seasonStart = new Date(worldConfig.seasonStart);
    await db.prisma.saveGame.update({
      where: { id: game.save.id },
      data: { currentDate: seasonStart },
    });

    const matchdayRepo = new PrismaMatchdayRepository(db.prisma);
    await simulateDueMatchdays(
      { repository: matchdayRepo, config: DEFAULT_MATCH_CONFIG },
      {
        saveGameId: game.save.id,
        fromDate: new Date(seasonStart.getTime() - 86_400_000),
        toDate: seasonStart,
      },
    );

    // The second division (no protagonist) also played its round.
    const secondSeason = await db.prisma.season.findFirstOrThrow({
      where: { competitionId: secondLeague!.id },
    });
    const secondPlayed = await db.prisma.fixture.count({
      where: { seasonId: secondSeason.id, status: 'PLAYED' },
    });
    expect(secondPlayed).toBe(2); // 4 clubs -> 2 fixtures

    const secondStandings = await db.prisma.standing.findMany({
      where: { seasonId: secondSeason.id },
    });
    const secondTotalPlayed = secondStandings.reduce((s, r) => s + r.played, 0);
    expect(secondTotalPlayed).toBe(4);

    // Appearances are only persisted for the protagonist's own league.
    const secondClubIds = (
      await db.prisma.club.findMany({
        where: { competitionId: secondLeague!.id },
        select: { id: true },
      })
    ).map((c) => c.id);
    const secondAppearances = await db.prisma.matchAppearance.count({
      where: { clubId: { in: secondClubIds } },
    });
    expect(secondAppearances).toBe(0);
    const topAppearances = await db.prisma.matchAppearance.count();
    expect(topAppearances).toBe(44); // only the protagonist league: 2 fixtures x 22 starters
  });

  it('exposes every league table through getStandings, flagging the protagonist club', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const standingsRepo = new PrismaStandingsRepository(db.prisma);
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

    const topLeague = await db.prisma.competition.findFirstOrThrow({
      where: { saveGameId: game.save.id, type: 'LEAGUE', tier: 1 },
    });
    const protagonistClub = await db.prisma.club.findFirstOrThrow({
      where: { competitionId: topLeague.id },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: protagonistClub.id },
    });

    const tables = await getStandings(standingsRepo, game.save.id);
    expect(tables.length).toBe(2);

    const protagonistTable = tables.find((t) => t.hasProtagonist);
    expect(protagonistTable).toBeDefined();
    expect(protagonistTable!.rows).toHaveLength(4);
    // Rows are 1..N by position and exactly one is flagged as the protagonist club.
    expect(protagonistTable!.rows.map((r) => r.position)).toEqual([1, 2, 3, 4]);
    expect(
      protagonistTable!.rows.filter((r) => r.isProtagonistClub),
    ).toHaveLength(1);
    expect(
      protagonistTable!.rows.find((r) => r.isProtagonistClub)!.clubId,
    ).toBe(protagonistClub.id);
  });
});
