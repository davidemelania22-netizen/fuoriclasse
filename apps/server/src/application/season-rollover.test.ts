import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { sortStandings } from '@football-life/simulation-engine';
import { PrismaMatchdayRepository } from '../repositories/prisma-matchday-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaSeasonRolloverRepository } from '../repositories/prisma-season-rollover-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { simulateDueMatchdays } from './simulate-matchday';
import { rolloverSeasonsIfComplete } from './season-rollover';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

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
  name: 'Rollover Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('rolloverSeasonsIfComplete', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  async function rankedClubIds(seasonId: string): Promise<string[]> {
    const rows = await db.prisma.standing.findMany({ where: { seasonId } });
    return sortStandings(
      rows.map((s) => ({
        clubId: s.clubId,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        points: s.points,
      })),
    ).map((r) => r.clubId);
  }

  it('promotes, relegates and generates the next season once all leagues finish', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const matchdayRepo = new PrismaMatchdayRepository(db.prisma);
    const rolloverRepo = new PrismaSeasonRolloverRepository(db.prisma);
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
    const topLeague = leagues.find((l) => l.tier === 1)!;
    const secondLeague = leagues.find((l) => l.tier === 2)!;

    // Rollover is not due while seasons are still scheduled.
    const early = await rolloverSeasonsIfComplete(
      { repository: rolloverRepo, promotionSlots: 1 },
      { saveGameId: game.save.id },
    );
    expect(early.rolledOver).toBe(false);

    // Play the whole season for every league at once.
    const seasonStart = new Date(worldConfig.seasonStart);
    await simulateDueMatchdays(
      { repository: matchdayRepo, config: DEFAULT_MATCH_CONFIG },
      {
        saveGameId: game.save.id,
        fromDate: new Date(seasonStart.getTime() - 86_400_000),
        toDate: new Date(seasonStart.getTime() + 250 * 86_400_000),
      },
    );

    const topSeason = await db.prisma.season.findFirstOrThrow({
      where: { competitionId: topLeague.id },
    });
    const secondSeason = await db.prisma.season.findFirstOrThrow({
      where: { competitionId: secondLeague.id },
    });
    expect(topSeason.status).toBe('COMPLETED');
    expect(secondSeason.status).toBe('COMPLETED');

    const topRanked = await rankedClubIds(topSeason.id);
    const secondRanked = await rankedClubIds(secondSeason.id);
    const relegatedClub = topRanked[topRanked.length - 1]!; // worst in top flight
    const promotedClub = secondRanked[0]!; // best in second flight

    const result = await rolloverSeasonsIfComplete(
      { repository: rolloverRepo, promotionSlots: 1 },
      { saveGameId: game.save.id },
    );
    expect(result.rolledOver).toBe(true);
    expect(result.newSeasonLabel).toBe('2025/2026');
    expect(result.promotedCount).toBe(1);
    expect(result.relegatedCount).toBe(1);

    // The worst top-flight club now sits in the second division and vice versa.
    const relegated = await db.prisma.club.findUniqueOrThrow({
      where: { id: relegatedClub },
    });
    const promoted = await db.prisma.club.findUniqueOrThrow({
      where: { id: promotedClub },
    });
    expect(relegated.competitionId).toBe(secondLeague.id);
    expect(promoted.competitionId).toBe(topLeague.id);

    // A fresh, scheduled season with a full fixture list and reset standings.
    const newTopSeason = await db.prisma.season.findFirstOrThrow({
      where: { competitionId: topLeague.id, label: '2025/2026' },
    });
    expect(newTopSeason.status).toBe('SCHEDULED');
    const newFixtures = await db.prisma.fixture.count({
      where: { seasonId: newTopSeason.id },
    });
    expect(newFixtures).toBe(12); // 4 clubs, double round robin
    const newStandings = await db.prisma.standing.findMany({
      where: { seasonId: newTopSeason.id },
    });
    expect(newStandings).toHaveLength(4);
    expect(newStandings.every((s) => s.played === 0)).toBe(true);

    // With the new season scheduled, a second rollover is not due.
    const again = await rolloverSeasonsIfComplete(
      { repository: rolloverRepo, promotionSlots: 1 },
      { saveGameId: game.save.id },
    );
    expect(again.rolledOver).toBe(false);
  });
});
