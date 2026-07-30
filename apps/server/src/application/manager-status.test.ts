import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaProfileRepository } from '../repositories/prisma-profile-repository';
import { PrismaManagerStatusRepository } from '../repositories/prisma-manager-status-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { getManagerStatus, updateManagerTrust } from './manager-status';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 2,
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
      cities: ['Milano', 'Torino', 'Roma', 'Napoli', 'Firenze'],
    },
  },
};

const newGame: NewGameInput = {
  name: 'Manager Status Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('manager status', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('derives trust/role/objective and evolves trust from matches', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const profileRepo = new PrismaProfileRepository(db.prisma);
    const statusRepo = new PrismaManagerStatusRepository(db.prisma);
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
      where: { saveGameId: game.save.id },
      orderBy: { id: 'asc' },
    });
    const myClub = clubs[0]!;
    const rivalClub = clubs[1]!;
    // Make the protagonist's club the weakest by reputation → objective SURVIVAL.
    await db.prisma.club.update({
      where: { id: myClub.id },
      data: { reputation: 500 },
    });
    await db.prisma.club.update({
      where: { id: rivalClub.id },
      data: { reputation: 5000 },
    });

    // Attach the protagonist to their club on a ROTATION contract.
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: myClub.id, careerStatus: 'ACTIVE' },
    });
    await db.prisma.contract.create({
      data: {
        saveGameId: game.save.id,
        playerId: game.player.id,
        clubId: myClub.id,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2027-06-30'),
        weeklyWage: 5000,
        signingBonus: 0,
        appearanceBonus: 0,
        goalBonus: 0,
        squadRole: 'ROTATION',
        status: 'ACTIVE',
      },
    });

    // Initial status: trust anchored to the ROTATION baseline (48), a weak club
    // fighting for survival, season not started yet.
    const initial = await getManagerStatus(profileRepo, statusRepo, game.save.id);
    expect(initial).not.toBeNull();
    expect(initial!.trust).toBe(48);
    expect(initial!.role.key).toBe('ROTATION');
    expect(initial!.objective.tier).toBe('SURVIVAL');
    expect(initial!.objective.targetPosition).toBe(2);
    expect(initial!.objective.status).toBe('PENDING');

    // A strong game raises trust above the baseline.
    const up = await updateManagerTrust(
      { profile: profileRepo, status: statusRepo },
      {
        saveGameId: game.save.id,
        matches: [
          { pagella: { rating: 8, goals: 1, assists: 0, redCards: 0 } },
        ],
        injured: false,
      },
    );
    expect(up).not.toBeNull();
    expect(up!.value).toBeGreaterThan(48);
    expect(up!.delta).toBeGreaterThan(0);

    const afterGood = await getManagerStatus(
      profileRepo,
      statusRepo,
      game.save.id,
    );
    expect(afterGood!.trust).toBe(up!.value);

    // Being fit but benched drifts trust back toward the baseline (downward).
    const benched = await updateManagerTrust(
      { profile: profileRepo, status: statusRepo },
      { saveGameId: game.save.id, matches: [{ pagella: null }], injured: false },
    );
    expect(benched!.value).toBeLessThan(up!.value);

    // Injured + benched holds trust steady (no judgement while out).
    const injured = await updateManagerTrust(
      { profile: profileRepo, status: statusRepo },
      { saveGameId: game.save.id, matches: [{ pagella: null }], injured: true },
    );
    expect(injured!.delta).toBe(0);
  });

  it('returns null for an unattached protagonist', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const profileRepo = new PrismaProfileRepository(db.prisma);
    const statusRepo = new PrismaManagerStatusRepository(db.prisma);
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
    // Protagonist has no club by default.
    expect(
      await getManagerStatus(profileRepo, statusRepo, game.save.id),
    ).toBeNull();
    expect(
      await updateManagerTrust(
        { profile: profileRepo, status: statusRepo },
        { saveGameId: game.save.id, matches: [], injured: false },
      ),
    ).toBeNull();
  });
});
