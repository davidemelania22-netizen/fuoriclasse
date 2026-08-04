import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaTransferMarketRepository } from '../repositories/prisma-transfer-market-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { runTransferWindow } from './transfer-market';
import { buildProtagonistNews, buildTransferNews } from './news';
import type { MatchdayReport } from './simulate-matchday';

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
  name: 'Transfer Market Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('runTransferWindow', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('moves a coveted player from a weaker club to a richer, stronger one', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const repo = new PrismaTransferMarketRepository(db.prisma);
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

    const clubs = await db.prisma.club.findMany({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
      orderBy: { reputation: 'desc' },
    });
    const buyer = clubs[0]!;
    const seller = clubs[clubs.length - 1]!;
    expect(buyer.reputation).toBeGreaterThan(seller.reputation);

    // Give the buyer money and make one seller player an irresistible target.
    await db.prisma.club.update({
      where: { id: buyer.id },
      data: { transferBudget: 100_000_000, balance: 100_000_000 },
    });
    const target = await db.prisma.player.findFirstOrThrow({
      where: { clubId: seller.id, careerStatus: 'ACTIVE' },
    });
    await db.prisma.player.update({
      where: { id: target.id },
      data: { currentAbility: 88, marketValue: 5_000_000 },
    });
    const sellerBalanceBefore = seller.balance;

    const transfers = await runTransferWindow(
      { repository: repo },
      { saveGameId: game.save.id, seasonLabel: '2025/2026' },
    );

    expect(transfers.length).toBeGreaterThan(0);
    // The coveted player moved to a higher-reputation club.
    const moved = await db.prisma.player.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(moved.clubId).not.toBe(seller.id);
    const newClub = await db.prisma.club.findUniqueOrThrow({
      where: { id: moved.clubId! },
    });
    expect(newClub.reputation).toBeGreaterThan(seller.reputation);

    // The selling club banked a fee.
    const sellerAfter = await db.prisma.club.findUniqueOrThrow({
      where: { id: seller.id },
    });
    expect(sellerAfter.balance).toBeGreaterThan(sellerBalanceBefore);

    // The protagonist (unattached here) is never part of the AI market.
    for (const t of transfers) {
      expect(t.playerName).not.toBe('Test Player');
    }
  });

  it('excludes the protagonist from the market', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const repo = new PrismaTransferMarketRepository(db.prisma);
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
    // Attach the protagonist to a club with a huge ability — still never sold.
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id, currentAbility: 99, careerStatus: 'ACTIVE' },
    });

    const transfers = await runTransferWindow(
      { repository: repo },
      { saveGameId: game.save.id, seasonLabel: '2025/2026' },
    );
    expect(transfers.every((t) => t.playerName !== 'Test Player')).toBe(true);
    const protagonist = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(protagonist.clubId).toBe(club.id); // stayed put
  });
});

describe('news builders', () => {
  it('summarises transfers with a banner plus one headline each', () => {
    const items = buildTransferNews(new Date('2025-06-01'), [
      {
        playerName: 'Mario Rossi',
        fromClubName: 'Small FC',
        toClubName: 'Big FC',
        fee: 5_000_000,
        ability: 82,
      },
    ]);
    expect(items).toHaveLength(2); // banner + one transfer
    expect(items[0]!.category).toBe('SEASON');
    expect(items[1]!.category).toBe('TRANSFER');
    expect(items[1]!.headline).toContain('Big FC');
    expect(buildTransferNews(new Date(), [])).toEqual([]);
  });

  it('only reports the protagonist when the match was standout', () => {
    const base: MatchdayReport = {
      date: '2024-09-01T00:00:00.000Z',
      competitionName: 'Prima Divisione',
      homeClubName: 'Us',
      awayClubName: 'Them',
      homeGoals: 3,
      awayGoals: 0,
      isHome: true,
      isDerby: false,
      approach: null,
      keyMoments: [],
      tabellino: [],
      liveFeed: [],
      homeLineup: [],
      awayLineup: [],
      pagella: null,
    };
    const dull: MatchdayReport = {
      ...base,
      pagella: {
        minutes: 90,
        rating: 6.1,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        comment: '',
      },
    };
    const great: MatchdayReport = {
      ...base,
      pagella: {
        minutes: 90,
        rating: 8.4,
        goals: 2,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        comment: '',
      },
    };
    expect(buildProtagonistNews([dull])).toHaveLength(0);
    const news = buildProtagonistNews([great]);
    expect(news).toHaveLength(1);
    expect(news[0]!.category).toBe('PROTAGONIST');
    expect(news[0]!.headline).toContain('Them');
  });
});
