import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaCareerTimelineRepository } from '../repositories/prisma-career-timeline-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { buildCareerTimeline } from './career-timeline';

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
  name: 'Career Timeline Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('buildCareerTimeline', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it('assembles debut, first goal, transfer, award and trophy events in chronological order', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const worldRepo = new PrismaWorldRepository(db.prisma);
    const repo = new PrismaCareerTimelineRepository(db.prisma);

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
      orderBy: { name: 'asc' },
    });
    const firstClub = clubs[0]!;
    const secondClub = clubs[1]!;

    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: firstClub.id },
    });

    await db.prisma.contract.create({
      data: {
        saveGameId: game.save.id,
        playerId: game.player.id,
        clubId: firstClub.id,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2025-06-30'),
        weeklyWage: 500,
        signingBonus: 0,
        appearanceBonus: 0,
        goalBonus: 0,
        squadRole: 'ROTATION',
        status: 'ACTIVE',
      },
    });
    await db.prisma.contract.create({
      data: {
        saveGameId: game.save.id,
        playerId: game.player.id,
        clubId: secondClub.id,
        startDate: new Date('2025-07-01'),
        endDate: new Date('2026-06-30'),
        weeklyWage: 800,
        signingBonus: 0,
        appearanceBonus: 0,
        goalBonus: 0,
        squadRole: 'ROTATION',
        status: 'ACTIVE',
      },
    });

    const season = await db.prisma.season.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: firstClub.competitionId! },
    });
    const opponentClub = clubs.find((c) => c.id !== firstClub.id)!;
    const fixture1 = await db.prisma.fixture.create({
      data: {
        saveGameId: game.save.id,
        seasonId: season.id,
        homeClubId: firstClub.id,
        awayClubId: opponentClub.id,
        scheduledAt: new Date('2024-08-24'),
        status: 'PLAYED',
        homeScore: 1,
        awayScore: 0,
        importance: 1,
      },
    });
    const fixture2 = await db.prisma.fixture.create({
      data: {
        saveGameId: game.save.id,
        seasonId: season.id,
        homeClubId: firstClub.id,
        awayClubId: opponentClub.id,
        scheduledAt: new Date('2024-08-31'),
        status: 'PLAYED',
        homeScore: 1,
        awayScore: 0,
        importance: 1,
      },
    });

    await db.prisma.matchAppearance.create({
      data: {
        fixtureId: fixture1.id,
        playerId: game.player.id,
        clubId: firstClub.id,
        started: true,
        minutesPlayed: 90,
        position: 'FW',
        rating: 6.5,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        statistics: {},
      },
    });
    await db.prisma.matchAppearance.create({
      data: {
        fixtureId: fixture2.id,
        playerId: game.player.id,
        clubId: firstClub.id,
        started: true,
        minutesPlayed: 90,
        position: 'FW',
        rating: 7.5,
        goals: 1,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        statistics: {},
      },
    });

    await db.prisma.honour.create({
      data: {
        saveGameId: game.save.id,
        seasonLabel: '2024/25',
        type: 'GOLDEN_BOOT',
        competitionId: firstClub.competitionId,
        competitionName: 'Italia Serie A',
        playerId: game.player.id,
        playerName: 'Test Player',
        createdAt: new Date('2025-05-01'),
      },
    });
    await db.prisma.honour.create({
      data: {
        saveGameId: game.save.id,
        seasonLabel: '2024/25',
        type: 'NATIONAL_CUP',
        competitionName: 'Coppa Italia',
        clubId: firstClub.id,
        clubName: firstClub.name,
        createdAt: new Date('2025-05-15'),
      },
    });
    // A trophy won by a DIFFERENT club must NOT be attributed to the protagonist.
    await db.prisma.honour.create({
      data: {
        saveGameId: game.save.id,
        seasonLabel: '2024/25',
        type: 'CONTINENTAL_CUP',
        competitionName: 'Champions League',
        clubId: opponentClub.id,
        clubName: opponentClub.name,
        createdAt: new Date('2025-05-20'),
      },
    });

    const events = await buildCareerTimeline(repo, game.save.id);
    expect(events).not.toBeNull();

    const types = events!.map((e) => e.type);
    expect(types).toEqual([
      'TRANSFER',
      'DEBUT',
      'FIRST_GOAL',
      'AWARD',
      'TROPHY',
      'TRANSFER',
    ]);
    expect(events![0]!.title).toBe('Esordio da professionista');
    expect(events![0]!.description).toContain(firstClub.name);
    expect(events![1]!.description).toContain(opponentClub.name);
    expect(events![3]!.title).toBe("Scarpa d'Oro");
    expect(events![4]!.title).toBe('Coppa Nazionale');
    expect(events![5]!.description).toContain(secondClub.name);

    // Chronological order end-to-end.
    const dates = events!.map((e) => new Date(e.date).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });

  it('returns null for a save with no protagonist player', async () => {
    const repo = new PrismaCareerTimelineRepository(db.prisma);
    const events = await buildCareerTimeline(repo, 'non-existent-save');
    expect(events).toBeNull();
  });
});
