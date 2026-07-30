import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NewGameInput } from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaInterviewRepository } from '../repositories/prisma-interview-repository';
import { PrismaNewsRepository } from '../repositories/prisma-news-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { getInterviewSession, submitInterview } from './interview';

const newGame: NewGameInput = {
  name: 'Interview News Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('press conference tied to the news', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  function makeDeps() {
    return {
      repo: new PrismaInterviewRepository(db.prisma),
      news: new PrismaNewsRepository(db.prisma),
    };
  }

  it('without news the session is fully generic', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    const session = await getInterviewSession(makeDeps(), game.save.id);
    expect(session).not.toBeNull();
    expect(session!.questions).toHaveLength(3);
    expect(session!.questions.every((q) => q.fromNews === false)).toBe(true);
  });

  it('recent news become the opening questions, headline included, and apply their consequences', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    const deps = makeDeps();

    await deps.news.addNews(game.save.id, [
      {
        gameDate: new Date('2024-08-01'),
        category: 'SCOUT',
        headline: 'Osservatori del Milano Calcio in tribuna',
        body: 'x',
      },
      {
        gameDate: new Date('2024-08-02'),
        category: 'SACKING',
        headline: 'Empoli Calcio esonera Mister Costa',
        body: 'x',
      },
      {
        gameDate: new Date('2024-08-03'),
        category: 'SCOUT', // duplicate category: must not produce a 2nd scout question
        headline: 'Osservatori del Torino in tribuna',
        body: 'x',
      },
      {
        gameDate: new Date('2024-08-04'),
        category: 'SEASON', // no template for this category
        headline: 'Sessione di mercato conclusa',
        body: 'x',
      },
    ]);

    const session = await getInterviewSession(deps, game.save.id);
    expect(session!.questions).toHaveLength(3);
    const newsQs = session!.questions.filter((q) => q.fromNews);
    expect(newsQs).toHaveLength(2); // scout + sacking, dedup by category
    expect(new Set(newsQs.map((q) => q.key)).size).toBe(2);
    // The newest matching headline is embedded in the prompt.
    expect(
      newsQs.some((q) => q.prompt.includes('Osservatori del Torino')),
    ).toBe(true);
    expect(
      newsQs.some((q) => q.prompt.includes('esonera Mister Costa')),
    ).toBe(true);
    // The third question is a generic one.
    expect(session!.questions.filter((q) => !q.fromNews)).toHaveLength(1);

    // Answering the news questions applies the template consequences.
    const before = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    const result = await submitInterview(deps, {
      saveGameId: game.save.id,
      answers: session!.questions.map((q) => ({
        questionKey: q.key,
        answerKey: 'humble',
      })),
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      // SCOUT humble (+5 rep) + SACKING humble (+6 rep) + generic humble > 0.
      expect(result.deltas.reputation ?? 0).toBeGreaterThanOrEqual(11);
    }
    const after = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(after.reputation).toBeGreaterThan(before.reputation);

    // One interview per week: a second submit is refused.
    const again = await submitInterview(deps, {
      saveGameId: game.save.id,
      answers: [{ questionKey: 'news-scout', answerKey: 'humble' }],
    });
    expect(again.status).toBe('already-done');
  });
});
