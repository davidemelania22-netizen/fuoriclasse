import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaSeasonReviewRepository } from '../repositories/prisma-season-review-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { reviewCompletedSeason } from './season-review';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

// 8 clubs so the top-reputation club finishing last is a "disaster" gap (7).
const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 8,
  clubsPerSecondDivision: 0,
  rosterSize: 12,
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
      cities: [
        'Milano',
        'Torino',
        'Roma',
        'Napoli',
        'Firenze',
        'Bologna',
        'Genova',
        'Palermo',
      ],
    },
  },
};

const newGame: NewGameInput = {
  name: 'Season Review Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

const NAME_POOLS = {
  IT: worldConfig.namePools.IT!.lastNames.map((n) => `Mister ${n}`),
};

describe('reviewCompletedSeason', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('crowns the champion and sacks the disastrous giant', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const reviewRepo = new PrismaSeasonReviewRepository(db.prisma);
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

    const competition = await db.prisma.competition.findFirstOrThrow({
      where: { saveGameId: game.save.id, type: 'LEAGUE' },
    });
    const clubs = await db.prisma.club.findMany({
      where: { competitionId: competition.id },
      orderBy: { reputation: 'desc' },
    });
    expect(clubs).toHaveLength(8);

    // Generated reputations are flat: spread them so clubs[0] is the clear
    // giant and the pecking order is unambiguous.
    for (let i = 0; i < clubs.length; i += 1) {
      clubs[i]!.reputation = 5000 - i * 400;
      await db.prisma.club.update({
        where: { id: clubs[i]!.id },
        data: { reputation: clubs[i]!.reputation },
      });
    }

    // A COMPLETED season where the table is reputation reversed: the biggest
    // club finishes dead last, the smallest wins the league.
    const season = await db.prisma.season.create({
      data: {
        saveGameId: game.save.id,
        competitionId: competition.id,
        label: '2024/2025',
        startDate: new Date('2024-08-17'),
        endDate: new Date('2025-05-30'),
        status: 'COMPLETED',
      },
    });
    await db.prisma.standing.createMany({
      data: clubs.map((club, index) => ({
        seasonId: season.id,
        clubId: club.id,
        played: 14,
        won: index, // more wins the lower the reputation
        drawn: 0,
        lost: 14 - index,
        goalsFor: index * 2,
        goalsAgainst: (14 - index) * 2,
        points: index * 3,
      })),
    });

    const news = await reviewCompletedSeason(
      { repository: reviewRepo, managerNamePools: NAME_POOLS },
      { saveGameId: game.save.id, gameDate: new Date('2025-06-01') },
    );

    // Champion news names the lowest-reputation club (most points).
    const champion = clubs[clubs.length - 1]!;
    const championNews = news.find((n) => n.category === 'SEASON');
    expect(championNews).toBeDefined();
    expect(championNews!.headline).toContain(champion.name);

    // The giant that finished last is certainly sacked.
    const giant = clubs[0]!;
    const sackingNews = news.filter((n) => n.category === 'SACKING');
    expect(sackingNews.some((n) => n.headline.includes(giant.name))).toBe(true);

    // The new manager name is persisted in the club philosophy.
    const updatedGiant = await db.prisma.club.findUniqueOrThrow({
      where: { id: giant.id },
    });
    const philosophy = updatedGiant.philosophy as { managerName?: string };
    expect(typeof philosophy.managerName).toBe('string');
    expect(philosophy.managerName!.startsWith('Mister ')).toBe(true);

    // Second run after the change: the same completed season no longer
    // triggers duplicate manager churn news for the overachievers.
    const again = await reviewCompletedSeason(
      { repository: reviewRepo, managerNamePools: NAME_POOLS },
      { saveGameId: game.save.id, gameDate: new Date('2025-06-01') },
    );
    expect(again.filter((n) => n.category === 'SEASON')).toHaveLength(1);
  });
});
