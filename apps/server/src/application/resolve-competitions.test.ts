import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { DEFAULT_MATCH_CONFIG } from '@football-life/game-data';
import { PrismaCompetitionCalendarRepository } from '../repositories/prisma-competition-calendar-repository';
import { PrismaContinentalRepository } from '../repositories/prisma-continental-repository';
import { PrismaCupRepository } from '../repositories/prisma-cup-repository';
import { PrismaNationalTeamRepository } from '../repositories/prisma-national-team-repository';
import { PrismaProfileRepository } from '../repositories/prisma-profile-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { resolveDueCompetitions } from './resolve-competitions';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
  { id: 'EN', code: 'EN', name: 'Inghilterra', reputation: 85 },
];

const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 4,
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
      firstNames: ['Marco', 'Luca', 'Matteo'],
      lastNames: ['Rossi', 'Bianchi', 'Esposito'],
      cities: ['Milano', 'Torino', 'Roma', 'Napoli'],
    },
    EN: {
      firstNames: ['James', 'Jack', 'Harry'],
      lastNames: ['Smith', 'Jones', 'Taylor'],
      cities: ['London', 'Manchester', 'Liverpool', 'Leeds'],
    },
  },
};

const newGame: NewGameInput = {
  name: 'Cup Calendar Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('resolveDueCompetitions', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  function deps() {
    return {
      calendarRepository: new PrismaCompetitionCalendarRepository(db.prisma),
      cupDeps: {
        repository: new PrismaCupRepository(db.prisma),
        config: DEFAULT_MATCH_CONFIG,
      },
      continentalDeps: {
        repository: new PrismaContinentalRepository(db.prisma),
        config: DEFAULT_MATCH_CONFIG,
        qualifiersPerCountry: 4,
      },
      nationalTeamDeps: {
        repository: new PrismaNationalTeamRepository(db.prisma),
        config: DEFAULT_MATCH_CONFIG,
        squadSize: 12,
      },
      profileRepository: new PrismaProfileRepository(db.prisma),
    };
  }

  it('auto-resolves cups, continental and national teams once per season', async () => {
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

    // Nothing is due early in the season.
    const early = await resolveDueCompetitions(deps(), {
      saveGameId: game.save.id,
      toDate: new Date('2024-09-01'),
    });
    expect(early).toHaveLength(0);

    // Late enough in the season, every competition resolves.
    const endOfSeason = new Date('2025-06-01');
    await db.prisma.saveGame.update({
      where: { id: game.save.id },
      data: { currentDate: endOfSeason },
    });

    const results = await resolveDueCompetitions(deps(), {
      saveGameId: game.save.id,
      toDate: endOfSeason,
    });

    const types = results.map((r) => r.type).sort();
    // Two national cups (one per country), one continental, one international.
    expect(results.filter((r) => r.type === 'CUP')).toHaveLength(2);
    expect(types).toContain('CONTINENTAL');
    expect(types).toContain('INTERNATIONAL');
    expect(results.every((r) => r.championName.length > 0)).toBe(true);

    const nationalCups = await db.prisma.honour.count({
      where: { saveGameId: game.save.id, type: 'NATIONAL_CUP' },
    });
    const continental = await db.prisma.honour.count({
      where: { saveGameId: game.save.id, type: 'CONTINENTAL_CUP' },
    });
    const international = await db.prisma.honour.count({
      where: { saveGameId: game.save.id, type: 'INTERNATIONAL' },
    });
    expect(nationalCups).toBe(2);
    expect(continental).toBe(1);
    expect(international).toBe(1);

    // Re-running the same season resolves nothing and creates no duplicates.
    const again = await resolveDueCompetitions(deps(), {
      saveGameId: game.save.id,
      toDate: endOfSeason,
    });
    expect(again).toHaveLength(0);
    const totalHonours = await db.prisma.honour.count({
      where: { saveGameId: game.save.id },
    });
    expect(totalHonours).toBe(4);
  });
});
