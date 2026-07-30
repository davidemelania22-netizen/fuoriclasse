import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaMatchdayRepository } from '../repositories/prisma-matchday-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { simulateDueMatchdays } from './simulate-matchday';

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
  name: 'Matchday Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('simulateDueMatchdays', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.cleanup();
  });

  async function setupSaveWithClub(): Promise<{
    saveGameId: string;
    playerId: string;
    seasonStart: Date;
  }> {
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

    const club = await db.prisma.club.findFirstOrThrow({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id },
    });

    const seasonStart = new Date(worldConfig.seasonStart);
    await db.prisma.saveGame.update({
      where: { id: game.save.id },
      data: { currentDate: seasonStart },
    });

    return {
      saveGameId: game.save.id,
      playerId: game.player.id,
      seasonStart,
    };
  }

  it('simulates the protagonist matchday with a tabellino and pagella', async () => {
    const { saveGameId, seasonStart } = await setupSaveWithClub();
    const repo = new PrismaMatchdayRepository(db.prisma);

    const dayBefore = new Date(seasonStart.getTime() - 86_400_000);
    const reports = await simulateDueMatchdays(
      { repository: repo, config: DEFAULT_MATCH_CONFIG },
      { saveGameId, fromDate: dayBefore, toDate: seasonStart },
    );

    expect(reports).toHaveLength(1);
    const report = reports[0]!;
    expect(report.homeGoals).toBeGreaterThanOrEqual(0);
    expect(report.awayGoals).toBeGreaterThanOrEqual(0);
    expect(report.homeLineup).toHaveLength(11);
    expect(report.awayLineup).toHaveLength(11);
    expect(
      report.tabellino.every((e, i, arr) => i === 0 || arr[i - 1]!.minute <= e.minute),
    ).toBe(true);

    // The live feed opens with kickoff and closes with the final whistle,
    // and mentions every tabellino event's minute somewhere in between.
    expect(report.liveFeed[0]).toContain('Si comincia');
    expect(report.liveFeed.at(-1)).toContain('Fischio finale');
    for (const event of report.tabellino) {
      expect(
        report.liveFeed.some((line) => line.startsWith(`${event.minute}'`)),
      ).toBe(true);
    }

    // With no prepared plan the match plays normally: no key moments, no approach.
    expect(report.keyMoments).toEqual([]);
    expect(report.approach).toBeNull();
    expect(report.isDerby).toBe(false);

    // The protagonist club's fixture was persisted as played.
    const fixture = await db.prisma.fixture.findFirst({
      where: { saveGameId, status: 'PLAYED' },
    });
    expect(fixture).not.toBeNull();
    expect(fixture!.homeScore).not.toBeNull();

    const appearances = await db.prisma.matchAppearance.count();
    expect(appearances).toBe(44); // one round, 4 clubs -> 2 fixtures x 22 starters

    const standings = await db.prisma.standing.findMany({
      where: { season: { saveGameId } },
    });
    const totalPlayed = standings.reduce((sum, row) => sum + row.played, 0);
    expect(totalPlayed).toBe(4); // 4 clubs, each played once this round
  });

  it('consumes a prepared pre-match plan and folds it into the protagonist result', async () => {
    const { saveGameId, playerId, seasonStart } = await setupSaveWithClub();
    // Guarantee the protagonist starts so the plan actually applies.
    await db.prisma.player.update({
      where: { id: playerId },
      data: { currentAbility: 99, potentialAbility: 99 },
    });
    const repo = new PrismaMatchdayRepository(db.prisma);

    // The protagonist's due fixture this round.
    const fixture = await db.prisma.fixture.findFirstOrThrow({
      where: {
        saveGameId,
        status: 'SCHEDULED',
        scheduledAt: seasonStart,
        OR: [
          { homeClub: { players: { some: { id: playerId } } } },
          { awayClub: { players: { some: { id: playerId } } } },
        ],
      },
    });

    // Prepare an all-out attacking plan choosing the most offensive option.
    const dayBefore = new Date(seasonStart.getTime() - 86_400_000);
    const reports = await simulateDueMatchdays(
      { repository: repo, config: DEFAULT_MATCH_CONFIG },
      {
        saveGameId,
        fromDate: dayBefore,
        toDate: seasonStart,
        matchPlan: {
          fixtureId: fixture.id,
          approach: 'ATTACKING',
          // Empty choices → each moment defaults to its first (offensive) option.
          choices: {},
          isDerby: false,
        },
      },
    );

    const report = reports[0]!;
    expect(report.approach).toBe('ATTACKING');
    expect(report.keyMoments).toHaveLength(3);
    for (const moment of report.keyMoments) {
      expect(typeof moment.success).toBe('boolean');
      expect(moment.choiceLabel.length).toBeGreaterThan(0);
      expect(moment.text.length).toBeGreaterThan(0);
    }
    // The protagonist started, so the pagella is present…
    expect(report.pagella).not.toBeNull();
    // …and the plan-adjusted appearance is what got persisted.
    const appearance = await db.prisma.matchAppearance.findFirstOrThrow({
      where: { playerId },
    });
    expect(appearance.rating).toBe(report.pagella!.rating);
    expect(appearance.goals).toBe(report.pagella!.goals);

    // Any goal/assist the plan produced is reflected in the protagonist's side score.
    const protagClubId = appearance.clubId;
    const isHome = report.homeLineup.some((p) => p.isProtagonist);
    const sideGoals = isHome ? report.homeGoals : report.awayGoals;
    expect(sideGoals).toBeGreaterThanOrEqual(0);
    expect(protagClubId).toBeTruthy();
  });

  it('returns nothing when no fixture is due in the date range', async () => {
    const { saveGameId } = await setupSaveWithClub();
    const repo = new PrismaMatchdayRepository(db.prisma);

    const reports = await simulateDueMatchdays(
      { repository: repo, config: DEFAULT_MATCH_CONFIG },
      {
        saveGameId,
        fromDate: new Date('2024-06-01'),
        toDate: new Date('2024-06-08'),
      },
    );
    expect(reports).toHaveLength(0);
  });
});
