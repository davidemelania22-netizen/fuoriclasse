import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import {
  DEFAULT_PROGRESSION_CONFIG,
  DEFAULT_RETIREMENT_CONFIG,
} from '@football-life/game-data';
import { PrismaNpcAgingRepository } from '../repositories/prisma-npc-aging-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { ageWorldAtSeasonBoundary } from './npc-aging';

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
  name: 'NPC Aging Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

const deps = (repo: PrismaNpcAgingRepository) => ({
  repository: repo,
  progressionConfig: DEFAULT_PROGRESSION_CONFIG,
  retirementConfig: DEFAULT_RETIREMENT_CONFIG,
  worldConfig,
});

describe('ageWorldAtSeasonBoundary', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('retires old NPCs, replaces them with youth, grows the young and skips the protagonist', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const repo = new PrismaNpcAgingRepository(db.prisma);
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

    const currentDate = new Date('2025-05-01');
    await db.prisma.saveGame.update({
      where: { id: game.save.id },
      data: { currentDate },
    });

    const yearsAgo = (years: number) =>
      new Date(Date.UTC(currentDate.getUTCFullYear() - years, 0, 1));

    const npcs = await db.prisma.player.findMany({
      where: {
        saveGameId: game.save.id,
        clubId: { not: null },
        personId: { not: game.save.playerPersonId! },
      },
      include: { person: true },
      orderBy: { id: 'asc' },
    });

    // Force the first NPC to be well past the forced-retirement age.
    const oldNpc = npcs[0]!;
    await db.prisma.person.update({
      where: { id: oldNpc.personId },
      data: { birthDate: yearsAgo(43) },
    });

    // Make the second NPC a raw teenager with lots of headroom.
    const youngNpc = npcs[1]!;
    await db.prisma.person.update({
      where: { id: youngNpc.personId },
      data: { birthDate: yearsAgo(18) },
    });
    await db.prisma.player.update({
      where: { id: youngNpc.id },
      data: { currentAbility: 40, potentialAbility: 85 },
    });

    // The protagonist is old too, but must be left untouched.
    const protagonistClub = oldNpc.clubId!;
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: {
        clubId: protagonistClub,
        currentAbility: 55,
        careerStatus: 'ACTIVE',
      },
    });
    await db.prisma.person.update({
      where: { id: game.save.playerPersonId! },
      data: { birthDate: yearsAgo(43) },
    });

    const clubCountBefore = await db.prisma.player.count({
      where: { clubId: protagonistClub },
    });

    const result = await ageWorldAtSeasonBoundary(deps(repo), {
      saveGameId: game.save.id,
      seasonLabel: '2025/2026',
    });

    expect(result.retiredCount).toBeGreaterThanOrEqual(1);
    expect(result.youthCount).toBe(result.retiredCount);

    // The forced-old NPC retired and left their club.
    const retired = await db.prisma.player.findUniqueOrThrow({
      where: { id: oldNpc.id },
    });
    expect(retired.careerStatus).toBe('RETIRED');
    expect(retired.clubId).toBeNull();

    // The teenager improved toward their potential.
    const grown = await db.prisma.player.findUniqueOrThrow({
      where: { id: youngNpc.id },
    });
    expect(grown.currentAbility).toBeGreaterThan(40);

    // The protagonist was skipped: still active despite being 43.
    const protagonist = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(protagonist.careerStatus).toBe('ACTIVE');
    expect(protagonist.currentAbility).toBe(55);

    // A replacement youth joined the club that lost the old NPC.
    const youths = await db.prisma.player.findMany({
      where: {
        clubId: protagonistClub,
        person: { birthDate: { gte: yearsAgo(21) } },
      },
      include: { person: true },
    });
    expect(youths.length).toBeGreaterThanOrEqual(1);

    // The retiree left and a youth arrived: the squad size is preserved.
    const clubCountAfter = await db.prisma.player.count({
      where: { clubId: protagonistClub },
    });
    expect(clubCountAfter).toBe(clubCountBefore);
  });
});
