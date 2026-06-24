import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NewGameInput } from '@football-life/shared';
import { EVENT_DEFINITIONS } from '@football-life/game-data';
import { PrismaEventRepository } from '../repositories/prisma-event-repository';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { generateWeeklyEvent, resolvePendingEvent } from './events';

const newGame: NewGameInput = {
  name: 'Event Test',
  player: {
    firstName: 'Test',
    lastName: 'Player',
    nationalityId: 'IT',
    primaryPosition: 'MF',
    preferredFoot: 'RIGHT',
  },
};

describe('dynamic events', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  it('generates a pending event and resolves a chosen outcome', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaEventRepository(db.prisma);
    const deps = { repository: repo, definitions: EVENT_DEFINITIONS };
    const game = await createNewGame({ repository: saveRepo }, newGame);

    const event = await generateWeeklyEvent(deps, { saveGameId: game.save.id });
    expect(event).not.toBeNull();
    expect(event!.choices.length).toBeGreaterThanOrEqual(1);

    const pending = await db.prisma.gameEvent.findUnique({
      where: { id: event!.gameEventId },
    });
    expect(pending?.status).toBe('PENDING');

    const result = await resolvePendingEvent(deps, {
      saveGameId: game.save.id,
      gameEventId: event!.gameEventId,
      choiceKey: event!.choices[0]!.key,
    });
    expect(result).not.toBeNull();

    const resolved = await db.prisma.gameEvent.findUnique({
      where: { id: event!.gameEventId },
    });
    expect(resolved?.status).toBe('RESOLVED');
    expect(resolved?.selectedChoiceKey).toBe(event!.choices[0]!.key);

    // Resolving again is a no-op.
    const second = await resolvePendingEvent(deps, {
      saveGameId: game.save.id,
      gameEventId: event!.gameEventId,
      choiceKey: event!.choices[0]!.key,
    });
    expect(second).toBeNull();
  });

  it('does not repeat the same event while it is on cooldown', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaEventRepository(db.prisma);
    const deps = { repository: repo, definitions: EVENT_DEFINITIONS };
    const game = await createNewGame({ repository: saveRepo }, newGame);

    const first = await generateWeeklyEvent(deps, { saveGameId: game.save.id });
    const second = await generateWeeklyEvent(deps, {
      saveGameId: game.save.id,
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.definitionId).not.toBe(first!.definitionId);
  });

  it('is reproducible: the same seed and state pick the same event', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaEventRepository(db.prisma);
    const deps = { repository: repo, definitions: EVENT_DEFINITIONS };

    const gameA = await createNewGame({ repository: saveRepo }, newGame);
    const gameB = await createNewGame({ repository: saveRepo }, newGame);

    const eventA = await generateWeeklyEvent(deps, {
      saveGameId: gameA.save.id,
    });
    const eventB = await generateWeeklyEvent(deps, {
      saveGameId: gameB.save.id,
    });

    expect(eventA?.definitionId).toBe(eventB?.definitionId);
  });
});
