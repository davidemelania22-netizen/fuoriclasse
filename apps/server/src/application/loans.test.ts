import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaProfileRepository } from '../repositories/prisma-profile-repository';
import { PrismaLoanRepository } from '../repositories/prisma-loan-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { decideLoan, maybeOfferLoan, returnFromLoanIfDue } from './loans';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

// Two divisions: the loan logic needs somewhere to send the player.
const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 4,
  clubsPerSecondDivision: 4,
  rosterSize: 14,
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
  name: 'Loan Test',
  player: {
    firstName: 'Giovane',
    lastName: 'Promessa',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('loans', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  async function setup() {
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
    // Sign for a top-division club as a benched teenager.
    const topClub = await db.prisma.club.findFirstOrThrow({
      where: {
        saveGameId: game.save.id,
        competition: { tier: 1 },
      },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: topClub.id, careerStatus: 'ACTIVE' },
    });

    const deps = {
      loans: new PrismaLoanRepository(db.prisma),
      profile: new PrismaProfileRepository(db.prisma),
    };
    return { game, deps, topClub };
  }

  it('offers a loan to a benched youngster, once per season', async () => {
    const { game, deps } = await setup();
    const result = await maybeOfferLoan(deps, {
      saveGameId: game.save.id,
      seed: game.save.id,
      gameDate: new Date('2024-09-01'),
    });
    expect(result).not.toBeNull();
    expect(result!.offer.status).toBe('PENDING');
    expect(result!.offer.options.length).toBeGreaterThan(0);
    expect(result!.news[0]!.headline).toContain('prestito');
    // Every destination is a real second-division club, never the parent one.
    for (const option of result!.offer.options) {
      const club = await db.prisma.club.findUniqueOrThrow({
        where: { id: option.clubId },
        include: { competition: true },
      });
      expect(club.competition?.tier).toBe(2);
    }

    // Idempotent within the season.
    expect(
      await maybeOfferLoan(deps, {
        saveGameId: game.save.id,
        seed: game.save.id,
        gameDate: new Date('2024-09-08'),
      }),
    ).toBeNull();
  });

  it('accepting moves the shirt but leaves the contract at the parent club', async () => {
    const { game, deps, topClub } = await setup();
    const offer = await maybeOfferLoan(deps, {
      saveGameId: game.save.id,
      seed: game.save.id,
      gameDate: new Date('2024-09-01'),
    });
    const destination = offer!.offer.options[0]!;

    const decision = await decideLoan(deps, {
      saveGameId: game.save.id,
      accept: true,
      clubId: destination.clubId,
    });
    expect(decision.status).toBe('ok');

    const player = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(player.clubId).toBe(destination.clubId);

    const profile = await deps.profile.getProfile(game.save.id);
    expect(profile!.activeLoan!.parentClubId).toBe(topClub.id);
    expect(profile!.activeLoan!.loanClubName).toBe(destination.clubName);
    // A fresh start with the new manager.
    expect(profile!.managerTrust).toBeGreaterThan(0);

    // The season boundary sends them home again.
    const news = await returnFromLoanIfDue(deps, {
      saveGameId: game.save.id,
      newSeasonLabel: '2025/2026',
      gameDate: new Date('2025-07-01'),
    });
    expect(news).toHaveLength(1);
    expect(news[0]!.headline).toContain('Rientro dal prestito');
    const back = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(back.clubId).toBe(topClub.id);
    expect((await deps.profile.getProfile(game.save.id))!.activeLoan).toBeNull();
  });

  it('declining closes the door for the season', async () => {
    const { game, deps, topClub } = await setup();
    await maybeOfferLoan(deps, {
      saveGameId: game.save.id,
      seed: game.save.id,
      gameDate: new Date('2024-09-01'),
    });
    const decision = await decideLoan(deps, {
      saveGameId: game.save.id,
      accept: false,
    });
    expect(decision).toEqual({ status: 'ok', accepted: false, clubName: null });

    const player = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(player.clubId).toBe(topClub.id);
    expect(
      (await deps.profile.getProfile(game.save.id))!.activeLoan,
    ).toBeNull();
    // A second decision has nothing to answer.
    expect(
      (await decideLoan(deps, { saveGameId: game.save.id, accept: true })).status,
    ).toBe('no-offer');
  });

  it('leaves established players alone', async () => {
    const { game, deps } = await setup();
    // A trusted regular is not loan material.
    await deps.profile.setManagerTrust(game.save.id, 80);
    expect(
      await maybeOfferLoan(deps, {
        saveGameId: game.save.id,
        seed: game.save.id,
        gameDate: new Date('2024-09-01'),
      }),
    ).toBeNull();
  });
});
