import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaCalendarRepository } from '../repositories/prisma-calendar-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { getCalendarMonth } from './calendar';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 2,
  clubsPerSecondDivision: 0,
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
  name: 'Calendar Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('monthly calendar', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('builds the month grid with matches, news, injuries and bounded navigation', async () => {
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
      data: { clubId: club.id, careerStatus: 'ACTIVE' },
    });

    // Play the club's first fixture: a 2-1 home win with a protagonist brace.
    const fixture = await db.prisma.fixture.findFirstOrThrow({
      where: {
        saveGameId: game.save.id,
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
      },
      orderBy: { scheduledAt: 'asc' },
    });
    const isHome = fixture.homeClubId === club.id;
    await db.prisma.fixture.update({
      where: { id: fixture.id },
      data: {
        status: 'PLAYED',
        homeScore: isHome ? 2 : 1,
        awayScore: isHome ? 1 : 2,
      },
    });
    await db.prisma.matchAppearance.create({
      data: {
        fixtureId: fixture.id,
        playerId: game.player.id,
        clubId: club.id,
        started: true,
        minutesPlayed: 90,
        position: 'FW',
        rating: 8.4,
        goals: 2,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        statistics: {},
      },
    });

    const day = fixture.scheduledAt.toISOString().slice(0, 10);
    const month = day.slice(0, 7);
    await db.prisma.newsItem.create({
      data: {
        saveGameId: game.save.id,
        gameDate: fixture.scheduledAt,
        category: 'PROTAGONIST',
        headline: 'Doppietta da urlo',
        body: 'Serata perfetta.',
      },
    });
    await db.prisma.injury.create({
      data: {
        saveGameId: game.save.id,
        playerId: game.player.id,
        injuryTypeKey: 'hamstring',
        startedAt: fixture.scheduledAt,
        expectedEndAt: new Date(fixture.scheduledAt.getTime() + 5 * 86400000),
        severity: 2,
        recurrenceRisk: 0.1,
        status: 'ACTIVE',
      },
    });
    await db.prisma.saveGame.update({
      where: { id: game.save.id },
      data: { currentDate: fixture.scheduledAt },
    });

    const deps = { calendar: new PrismaCalendarRepository(db.prisma) };

    // Default month = the save's current one.
    const view = await getCalendarMonth(deps, { saveGameId: game.save.id });
    expect(view).not.toBeNull();
    expect(view!.month).toBe(month);
    expect(view!.clubName).toBe(club.name);
    expect(view!.days.length).toBeGreaterThanOrEqual(28);

    const matchDay = view!.days.find((d) => d.date === day);
    expect(matchDay).toBeDefined();
    expect(matchDay!.isToday).toBe(true);
    expect(matchDay!.injured).toBe(true);

    const match = matchDay!.entries.find((e) => e.kind === 'MATCH');
    expect(match).toBeDefined();
    if (match?.kind === 'MATCH') {
      expect(match.outcome).toBe('W');
      expect(match.scoreLine).toBe('2-1');
      expect(match.rating).toBeCloseTo(8.4);
      expect(match.goals).toBe(2);
    }
    expect(matchDay!.entries.some((e) => e.kind === 'NEWS')).toBe(true);
    expect(
      matchDay!.entries.some(
        (e) => e.kind === 'INJURY' && e.phase === 'START',
      ),
    ).toBe(true);

    // Future fixtures show as scheduled, without a score.
    const upcoming = view!.days
      .flatMap((d) => d.entries)
      .filter((e) => e.kind === 'MATCH' && e.outcome === null);
    for (const entry of upcoming) {
      if (entry.kind === 'MATCH') expect(entry.scoreLine).toBeNull();
    }

    // Navigation is bounded by the fixture span.
    const lastFixture = await db.prisma.fixture.findFirstOrThrow({
      where: {
        saveGameId: game.save.id,
        OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
      },
      orderBy: { scheduledAt: 'desc' },
    });
    const lastMonth = lastFixture.scheduledAt.toISOString().slice(0, 7);
    expect(view!.nav.next).toBe(month < lastMonth ? nextMonth(month) : null);
    let cursor = view!;
    let guard = 0;
    while (cursor.nav.prev && guard < 24) {
      cursor = (await getCalendarMonth(deps, {
        saveGameId: game.save.id,
        month: cursor.nav.prev,
      }))!;
      guard += 1;
    }
    expect(cursor.nav.prev).toBeNull();
    expect(guard).toBeLessThan(24);

    // Unknown save → null.
    expect(
      await getCalendarMonth(deps, { saveGameId: 'missing', month }),
    ).toBeNull();

    // Malformed month falls back to the current one.
    const fallback = await getCalendarMonth(deps, {
      saveGameId: game.save.id,
      month: 'not-a-month',
    });
    expect(fallback!.month).toBe(month);
  });
});

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 7);
}
