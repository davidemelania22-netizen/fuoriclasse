import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaAwardsRepository } from '../repositories/prisma-awards-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaSeasonRepository } from '../repositories/prisma-season-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { simulateSeasonForSave } from './simulate-season';
import { assignSeasonAwards } from './awards';

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
  name: 'Awards Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('assignSeasonAwards', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it('returns null when the protagonist\'s league has no completed season yet', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const awardsRepo = new PrismaAwardsRepository(db.prisma);

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
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id },
    });

    const result = await assignSeasonAwards(awardsRepo, game.save.id);
    expect(result).toBeNull();
  });

  it('crowns the Golden Boot and Player of the Season once the league season completes, and is idempotent', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const seasonRepo = new PrismaSeasonRepository(db.prisma);
    const awardsRepo = new PrismaAwardsRepository(db.prisma);

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
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id },
    });

    const season = await db.prisma.season.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: club.competitionId! },
    });
    await simulateSeasonForSave(
      { repository: seasonRepo, config: DEFAULT_MATCH_CONFIG },
      { seasonId: season.id },
    );

    const first = await assignSeasonAwards(awardsRepo, game.save.id);
    expect(first).not.toBeNull();
    expect(first!.alreadyAwarded).toBe(false);
    expect(first!.goldenBoot).not.toBeNull();
    expect(first!.playerOfSeason).not.toBeNull();
    expect(first!.goldenBoot!.goals).toBeGreaterThanOrEqual(0);

    const honours = await db.prisma.honour.findMany({
      where: { saveGameId: game.save.id },
    });
    expect(honours.some((h) => h.type === 'GOLDEN_BOOT')).toBe(true);
    expect(honours.some((h) => h.type === 'BALLON_DOR')).toBe(true);

    const second = await assignSeasonAwards(awardsRepo, game.save.id);
    expect(second!.alreadyAwarded).toBe(true);
    expect(second!.goldenBoot!.playerName).toBe(first!.goldenBoot!.playerName);
    expect(second!.playerOfSeason!.playerName).toBe(
      first!.playerOfSeason!.playerName,
    );

    const honoursAfterSecondCall = await db.prisma.honour.count({
      where: { saveGameId: game.save.id },
    });
    expect(honoursAfterSecondCall).toBe(honours.length);
    // A top-flight season is watched by the world.
    expect(first!.ballonDorEligible).toBe(true);
    expect(first!.leagueStrength).toBeGreaterThan(0.78);
  });

  it('a weak league still crowns its top scorer but no Ballon d\'Or', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const seasonRepo = new PrismaSeasonRepository(db.prisma);
    const awardsRepo = new PrismaAwardsRepository(db.prisma);

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
    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id },
    });

    // Demote the protagonist's league far below the world's best.
    await db.prisma.competition.update({
      where: { id: club.competitionId! },
      data: { reputation: 300 },
    });
    await db.prisma.competition.create({
      data: {
        saveGameId: game.save.id,
        name: 'Superlega',
        countryId: 'IT',
        type: 'LEAGUE',
        tier: 1,
        reputation: 5000,
        seasonStart: new Date('2024-08-17'),
        seasonEnd: new Date('2025-05-30'),
        rules: {},
      },
    });

    const season = await db.prisma.season.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: club.competitionId! },
    });
    await simulateSeasonForSave(
      { repository: seasonRepo, config: DEFAULT_MATCH_CONFIG },
      { seasonId: season.id },
    );

    const result = await assignSeasonAwards(awardsRepo, game.save.id);
    expect(result).not.toBeNull();
    expect(result!.ballonDorEligible).toBe(false);
    expect(result!.leagueStrength).toBeLessThan(0.78);
    expect(result!.leagueStrengthLabel).toBeTruthy();
    // The local top scorer is still crowned...
    expect(result!.goldenBoot).not.toBeNull();
    // ...but the world-level award is not handed out down here.
    expect(result!.playerOfSeason).toBeNull();
    expect(
      await db.prisma.honour.count({
        where: { saveGameId: game.save.id, type: 'BALLON_DOR' },
      }),
    ).toBe(0);
  });
});
