import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CountryRecord,
  NewGameInput,
  WorldGenerationConfig,
} from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaWorldRepository } from '../repositories/prisma-world-repository';
import { PrismaLeagueContextRepository } from '../repositories/prisma-league-context-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateAndPersistWorld } from './generate-world';
import {
  applyMatchReputation,
  getLeagueSpotlight,
  resolveSpotlight,
} from './league-context';
import type { MatchdayReport } from './simulate-matchday';

const countries: CountryRecord[] = [
  { id: 'IT', code: 'IT', name: 'Italia', reputation: 88 },
];

const worldConfig: WorldGenerationConfig = {
  seasonStart: '2024-08-17',
  seasonLengthDays: 300,
  clubsPerTopDivision: 4,
  clubsPerSecondDivision: 4,
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
  name: 'League Context',
  player: {
    firstName: 'Vetrina',
    lastName: 'Tester',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

/** One brilliant game: 8.5, a brace and an assist. */
function greatGame(): MatchdayReport {
  return {
    date: '2024-09-01T00:00:00.000Z',
    competitionName: 'Test',
    homeClubName: 'A',
    awayClubName: 'B',
    homeGoals: 3,
    awayGoals: 1,
    isHome: true,
    isDerby: false,
    approach: null,
    keyMoments: [],
    tabellino: [],
    liveFeed: [],
    homeLineup: [],
    awayLineup: [],
    pagella: {
      rating: 8.5,
      goals: 2,
      assists: 1,
      yellowCards: 0,
      redCards: 0,
      comment: 'Devastante.',
    },
  };
}

describe('league context', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  async function setup(tier: number) {
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
      where: { saveGameId: game.save.id, competition: { tier } },
    });
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: club.id, careerStatus: 'ACTIVE', reputation: 500 },
    });
    return {
      game,
      repository: new PrismaLeagueContextRepository(db.prisma),
    };
  }

  it('rates the top division higher than the one below it', async () => {
    const top = await setup(1);
    const second = await setup(2);

    const topSpotlight = (await getLeagueSpotlight(
      top.repository,
      top.game.save.id,
    ))!;
    const secondSpotlight = (await getLeagueSpotlight(
      second.repository,
      second.game.save.id,
    ))!;

    expect(topSpotlight.strength).toBe(1);
    expect(topSpotlight.stars).toBe(5);
    expect(secondSpotlight.strength).toBeLessThan(topSpotlight.strength);
    // Every consequence follows the strength, in the same direction.
    expect(secondSpotlight.growthModifier).toBeLessThan(
      topSpotlight.growthModifier,
    );
    expect(secondSpotlight.scoutAttention).toBeLessThan(
      topSpotlight.scoutAttention,
    );
  });

  it('is neutral for a player with no club, so nothing is scaled by zero', async () => {
    const { game, repository } = await setup(1);
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { clubId: null },
    });
    expect(await getLeagueSpotlight(repository, game.save.id)).toBeNull();
    const fallback = await resolveSpotlight(repository, game.save.id);
    expect(fallback.growthModifier).toBe(1);
    expect(fallback.scoutAttention).toBe(1);
    expect(fallback.strength).toBe(1);
  });

  it('turns the same performance into more fame in the stronger league', async () => {
    const top = await setup(1);
    const second = await setup(2);
    const gameDate = new Date('2024-09-01');

    const inTop = await applyMatchReputation(top.repository, {
      saveGameId: top.game.save.id,
      matches: [greatGame()],
      spotlight: await resolveSpotlight(top.repository, top.game.save.id),
      gameDate,
    });
    const inSecond = await applyMatchReputation(second.repository, {
      saveGameId: second.game.save.id,
      matches: [greatGame()],
      spotlight: await resolveSpotlight(second.repository, second.game.save.id),
      gameDate,
    });

    expect(inTop!.delta).toBeGreaterThan(inSecond!.delta);
    expect(inSecond!.delta).toBeGreaterThan(0);
    // The gain is really persisted, not just reported.
    const player = await db.prisma.player.findUniqueOrThrow({
      where: { id: top.game.player.id },
    });
    expect(player.reputation).toBe(inTop!.reputation);
    expect(player.reputation).toBeGreaterThan(500);
  });

  it('announces the milestone the week the player becomes a name', async () => {
    const { game, repository } = await setup(1);
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { reputation: 1480 },
    });
    const spotlight = await resolveSpotlight(repository, game.save.id);

    const crossing = await applyMatchReputation(repository, {
      saveGameId: game.save.id,
      matches: [greatGame()],
      spotlight,
      gameDate: new Date('2024-09-01'),
    });
    expect(crossing!.reputation).toBeGreaterThanOrEqual(1500);
    expect(crossing!.news).toHaveLength(1);
    expect(crossing!.news[0]!.category).toBe('MEDIA');

    // The same milestone is not announced twice.
    const after = await applyMatchReputation(repository, {
      saveGameId: game.save.id,
      matches: [greatGame()],
      spotlight,
      gameDate: new Date('2024-09-08'),
    });
    expect(after!.news).toHaveLength(0);
  });

  it('leaves a week with no appearances alone', async () => {
    const { game, repository } = await setup(1);
    const result = await applyMatchReputation(repository, {
      saveGameId: game.save.id,
      matches: [],
      spotlight: await resolveSpotlight(repository, game.save.id),
      gameDate: new Date('2024-09-01'),
    });
    expect(result).toBeNull();
    const player = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(player.reputation).toBe(500);
  });
});
