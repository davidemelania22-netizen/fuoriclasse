import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaProfileRepository } from '../repositories/prisma-profile-repository';
import { PrismaCareerRepository } from '../repositories/prisma-career-repository';
import { PrismaScoutingRepository } from '../repositories/prisma-scouting-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import { getScoutWatchers, runScoutingWeek } from './scouting';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
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
      firstNames: ['Marco', 'Luca', 'Matteo', 'Andrea', 'Davide'],
      lastNames: ['Rossi', 'Bianchi', 'Esposito', 'Romano', 'Colombo'],
      cities: ['Milano', 'Torino', 'Roma', 'Napoli', 'Firenze'],
    },
  },
};

const newGame: NewGameInput = {
  name: 'Scouting Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('scouting', () => {
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

    // Distinct reputations; protagonist joins the smallest club so every
    // other club is a scouting candidate.
    const clubs = await db.prisma.club.findMany({
      where: { saveGameId: game.save.id, competitionId: { not: null } },
      orderBy: { id: 'asc' },
    });
    for (let i = 0; i < clubs.length; i += 1) {
      await db.prisma.club.update({
        where: { id: clubs[i]!.id },
        data: { reputation: 1000 + i * 1000 },
      });
    }
    const smallest = clubs[0]!;
    const biggest = clubs[clubs.length - 1]!;
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: smallest.id, careerStatus: 'ACTIVE' },
    });

    const deps = {
      scouting: new PrismaScoutingRepository(db.prisma),
      profile: new PrismaProfileRepository(db.prisma),
      career: new PrismaCareerRepository(db.prisma),
    };
    return { game, deps, smallest, biggest };
  }

  it('turns a hot dossier into a real transfer offer and cools it down', async () => {
    const { game, deps, biggest } = await setup();

    // A dossier well past the threshold (earned in previous weeks): even
    // after this idle week's fade (90 → 82.8) the board still moves.
    await deps.profile.setScoutInterest(game.save.id, { [biggest.id]: 90 });

    const week = await runScoutingWeek(deps, {
      saveGameId: game.save.id,
      matches: [], // no match this week: the offer comes from the backlog
    });
    expect(week).not.toBeNull();
    expect(week!.offersFrom).toContain(biggest.name);
    expect(
      week!.news.some(
        (n) => n.category === 'SCOUT' && n.headline.includes(biggest.name),
      ),
    ).toBe(true);

    // A concrete PENDING offer from that club exists.
    const offer = await db.prisma.transferOffer.findFirst({
      where: {
        playerId: game.player.id,
        toClubId: biggest.id,
        status: 'PENDING',
      },
    });
    expect(offer).not.toBeNull();
    expect(offer!.offeredWage).toBeGreaterThan(0);

    // The dossier cooled down to the post-offer level.
    const profile = await deps.profile.getProfile(game.save.id);
    expect(profile!.scoutInterest[biggest.id]).toBe(45);
  });

  it('fades unattended dossiers and closes tiny ones', async () => {
    const { game, deps, biggest } = await setup();
    const other = await db.prisma.club.findFirstOrThrow({
      where: {
        saveGameId: game.save.id,
        competitionId: { not: null },
        id: { not: biggest.id },
        reputation: { gt: 1000 },
      },
    });
    await deps.profile.setScoutInterest(game.save.id, {
      [biggest.id]: 50,
      [other.id]: 0.9, // about to close
    });

    await runScoutingWeek(deps, { saveGameId: game.save.id, matches: [] });

    const profile = await deps.profile.getProfile(game.save.id);
    expect(profile!.scoutInterest[biggest.id]).toBeLessThan(50);
    expect(profile!.scoutInterest[biggest.id]).toBeGreaterThan(40);
    expect(profile!.scoutInterest[other.id]).toBeUndefined();

    // Dashboard widget reads the same dossiers.
    const watchers = await getScoutWatchers(deps, game.save.id);
    expect(watchers.length).toBe(1);
    expect(watchers[0]!.clubName).toBe(biggest.name);
  });

  it('returns null for an unattached protagonist', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    const deps = {
      scouting: new PrismaScoutingRepository(db.prisma),
      profile: new PrismaProfileRepository(db.prisma),
      career: new PrismaCareerRepository(db.prisma),
    };
    expect(
      await runScoutingWeek(deps, { saveGameId: game.save.id, matches: [] }),
    ).toBeNull();
    expect(await getScoutWatchers(deps, game.save.id)).toEqual([]);
  });
});
