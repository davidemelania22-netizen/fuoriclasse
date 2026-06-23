import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_CAREER_CONFIG } from '@football-life/game-data';
import { PrismaCareerRepository } from '../repositories/prisma-career-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import {
  generateProtagonistOffers,
  renewProtagonistContract,
  respondToOffer,
  signWithClub,
  updateProtagonistMarketValue,
} from './career';

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
  name: 'Career Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

async function newGameWithWorld(db: TestDatabase) {
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
  return game;
}

describe('career: contracts, renewals, market value', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('signs a first contract, joining the club', async () => {
    const game = await newGameWithWorld(db);
    const repo = new PrismaCareerRepository(db.prisma);
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id },
    });

    const result = await signWithClub(
      { repository: repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: game.save.id, clubId: club.id },
    );

    expect(result).not.toBeNull();
    expect(result?.weeklyWage).toBeGreaterThan(0);

    const player = await db.prisma.player.findUnique({
      where: { id: game.player.id },
    });
    expect(player?.clubId).toBe(club.id);
    expect(player?.careerStatus).toBe('ACTIVE');

    const contract = await db.prisma.contract.findFirst({
      where: { playerId: game.player.id, status: 'ACTIVE' },
    });
    expect(contract).not.toBeNull();
  });

  it('renews a contract to a later end date', async () => {
    const game = await newGameWithWorld(db);
    const repo = new PrismaCareerRepository(db.prisma);
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id },
    });
    await signWithClub(
      { repository: repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: game.save.id, clubId: club.id },
    );
    const original = await db.prisma.contract.findFirstOrThrow({
      where: { playerId: game.player.id, status: 'ACTIVE' },
    });

    // Advance the in-world clock so renewal extends the deal.
    await db.prisma.saveGame.update({
      where: { id: game.save.id },
      data: { currentDate: new Date('2025-03-01T00:00:00.000Z') },
    });

    const renewal = await renewProtagonistContract(
      { repository: repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: game.save.id },
    );
    expect(renewal).not.toBeNull();
    expect(new Date(renewal!.newEndDate).getTime()).toBeGreaterThan(
      original.endDate.getTime(),
    );
  });

  it('computes and persists a market value', async () => {
    const game = await newGameWithWorld(db);
    const repo = new PrismaCareerRepository(db.prisma);
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id },
    });
    await signWithClub(
      { repository: repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: game.save.id, clubId: club.id },
    );

    const value = await updateProtagonistMarketValue(
      { repository: repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: game.save.id },
    );
    expect(value).not.toBeNull();
    expect(value!).toBeGreaterThan(0);

    const player = await db.prisma.player.findUnique({
      where: { id: game.player.id },
    });
    expect(player?.marketValue).toBe(value);
  });
});

describe('career: transfer offers', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  async function boostedProtagonistAtClub(): Promise<{
    saveGameId: string;
    playerId: string;
    repo: PrismaCareerRepository;
    homeClubId: string;
  }> {
    const game = await newGameWithWorld(db);
    const repo = new PrismaCareerRepository(db.prisma);
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id },
    });
    await signWithClub(
      { repository: repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: game.save.id, clubId: club.id },
    );
    // Make the protagonist attractive and affordable.
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: {
        currentAbility: 75,
        potentialAbility: 82,
        reputation: 2000,
        form: 62,
        marketValue: 1_500_000,
      },
    });
    return {
      saveGameId: game.save.id,
      playerId: game.player.id,
      repo,
      homeClubId: club.id,
    };
  }

  it('generates offers from interested, solvent clubs', async () => {
    const ctx = await boostedProtagonistAtClub();
    const offers = await generateProtagonistOffers(
      { repository: ctx.repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: ctx.saveGameId },
    );
    expect(offers).not.toBeNull();
    expect(offers!.length).toBeGreaterThanOrEqual(1);
    for (const offer of offers!) {
      expect(offer.toClubId).not.toBe(ctx.homeClubId);
      expect(offer.fee).toBeGreaterThan(0);
    }
  });

  it('accepting an offer transfers the player and writes a new contract', async () => {
    const ctx = await boostedProtagonistAtClub();
    const offers = await generateProtagonistOffers(
      { repository: ctx.repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: ctx.saveGameId },
    );
    const offer = offers![0]!;
    const buyingClubBefore = await db.prisma.club.findUniqueOrThrow({
      where: { id: offer.toClubId },
    });

    const response = await respondToOffer(
      { repository: ctx.repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: ctx.saveGameId, offerId: offer.id, accept: true },
    );
    expect(response?.accepted).toBe(true);

    const player = await db.prisma.player.findUnique({
      where: { id: ctx.playerId },
    });
    expect(player?.clubId).toBe(offer.toClubId);

    const acceptedOffer = await db.prisma.transferOffer.findUnique({
      where: { id: offer.id },
    });
    expect(acceptedOffer?.status).toBe('ACCEPTED');

    const newContract = await db.prisma.contract.findFirst({
      where: { playerId: ctx.playerId, status: 'ACTIVE' },
    });
    expect(newContract?.clubId).toBe(offer.toClubId);
    expect(newContract?.weeklyWage).toBe(offer.offeredWage);

    const buyingClubAfter = await db.prisma.club.findUniqueOrThrow({
      where: { id: offer.toClubId },
    });
    expect(buyingClubAfter.transferBudget).toBe(
      buyingClubBefore.transferBudget - offer.fee,
    );
  });

  it('rejecting an offer leaves the player at the current club', async () => {
    const ctx = await boostedProtagonistAtClub();
    const offers = await generateProtagonistOffers(
      { repository: ctx.repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: ctx.saveGameId },
    );
    const offer = offers![0]!;

    await respondToOffer(
      { repository: ctx.repo, config: DEFAULT_CAREER_CONFIG },
      { saveGameId: ctx.saveGameId, offerId: offer.id, accept: false },
    );

    const rejected = await db.prisma.transferOffer.findUnique({
      where: { id: offer.id },
    });
    expect(rejected?.status).toBe('REJECTED');

    const player = await db.prisma.player.findUnique({
      where: { id: ctx.playerId },
    });
    expect(player?.clubId).toBe(ctx.homeClubId);
  });
});
