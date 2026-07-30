import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NewGameInput } from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaProfileRepository } from '../repositories/prisma-profile-repository';
import { PrismaInterviewRepository } from '../repositories/prisma-interview-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import {
  answerPostMatch,
  getPendingPostMatch,
  queuePostMatch,
} from './post-match';
import type { MatchdayReport } from './simulate-matchday';

const newGame: NewGameInput = {
  name: 'Post Match Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

function reportWith(pagella: MatchdayReport['pagella']): MatchdayReport {
  return {
    date: '2024-09-01T00:00:00.000Z',
    competitionName: 'Serie A',
    homeClubName: 'Noi',
    awayClubName: 'Loro',
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
    pagella,
  };
}

describe('post-match flash interview', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('queues after a played match, renders, applies the answer and clears', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    const deps = {
      profile: new PrismaProfileRepository(db.prisma),
      interview: new PrismaInterviewRepository(db.prisma),
    };

    // No match played → nothing queued.
    expect(
      await queuePostMatch(deps, {
        saveGameId: game.save.id,
        matches: [reportWith(null)],
      }),
    ).toBeNull();
    expect(await getPendingPostMatch(deps, game.save.id)).toBeNull();

    // A standout game queues the star question against the right opponent.
    const session = await queuePostMatch(deps, {
      saveGameId: game.save.id,
      matches: [
        reportWith({
          rating: 8.2,
          goals: 2,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          comment: '',
        }),
      ],
    });
    expect(session).not.toBeNull();
    expect(session!.question.key).toBe('pm-star');
    expect(session!.opponent).toBe('Loro');
    expect(session!.question.prompt).toContain('Loro');
    expect(session!.question.answers.length).toBeGreaterThanOrEqual(3);

    // The pending session survives a dashboard reload.
    const pending = await getPendingPostMatch(deps, game.save.id);
    expect(pending?.question.key).toBe('pm-star');

    // Answering applies the tone's stat trade-off and clears the pending.
    const before = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    const result = await answerPostMatch(deps, {
      saveGameId: game.save.id,
      answerKey: 'bold',
    });
    expect(result.status).toBe('ok');
    const after = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    // pm-star / bold: popularity up, stress up.
    expect(after.popularity).toBeGreaterThan(before.popularity);
    expect(after.stress).toBeGreaterThan(before.stress);

    expect(await getPendingPostMatch(deps, game.save.id)).toBeNull();
    expect(
      (
        await answerPostMatch(deps, {
          saveGameId: game.save.id,
          answerKey: 'bold',
        })
      ).status,
    ).toBe('no-pending');
  });

  it('picks win/loss/draw questions from the result', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    const deps = {
      profile: new PrismaProfileRepository(db.prisma),
      interview: new PrismaInterviewRepository(db.prisma),
    };
    const dull = {
      rating: 6.2,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      comment: '',
    };

    const win = await queuePostMatch(deps, {
      saveGameId: game.save.id,
      matches: [reportWith(dull)], // 3-1 at home
    });
    expect(win!.question.key).toBe('pm-win');

    const lossReport = { ...reportWith(dull), homeGoals: 0, awayGoals: 2 };
    const loss = await queuePostMatch(deps, {
      saveGameId: game.save.id,
      matches: [lossReport],
    });
    expect(loss!.question.key).toBe('pm-loss');

    const drawReport = { ...reportWith(dull), homeGoals: 1, awayGoals: 1 };
    const draw = await queuePostMatch(deps, {
      saveGameId: game.save.id,
      matches: [drawReport],
    });
    expect(draw!.question.key).toBe('pm-draw');
  });
});
