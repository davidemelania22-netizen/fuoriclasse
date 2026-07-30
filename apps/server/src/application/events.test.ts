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

  it('hands the player every consequence before they decide', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaEventRepository(db.prisma);
    const deps = { repository: repo, definitions: EVENT_DEFINITIONS };
    const game = await createNewGame({ repository: saveRepo }, newGame);

    const event = await generateWeeklyEvent(deps, { saveGameId: game.save.id });
    const definition = EVENT_DEFINITIONS.find(
      (candidate) => candidate.id === event!.definitionId,
    )!;
    for (const choice of event!.choices) {
      const source = definition.choices.find((c) => c.key === choice.key)!;
      expect(choice.consequences).toEqual(source.consequences);
      if (source.gamble) expect(choice.gamble).toEqual(source.gamble);
    }

    // The same choices survive the round-trip through the database.
    const listed = await repo.listPendingEvents(game.save.id);
    expect(listed[0]!.choices).toEqual(event!.choices);
  });

  it('still reads events stored before choices carried their effects', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaEventRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);

    // Exactly what an older version of the game wrote: label only.
    await db.prisma.gameEvent.create({
      data: {
        saveGameId: game.save.id,
        definitionKey: 'fb-bad-week',
        category: 'FOOTBALL',
        occurredAt: new Date('2024-09-01'),
        title: 'Periodo difficile',
        description: 'Vecchio evento.',
        status: 'PENDING',
        subjects: {},
        payload: { choices: [{ key: 'rest', label: 'Prenditi una pausa' }] },
      },
    });

    const listed = await repo.listPendingEvents(game.save.id);
    expect(listed[0]!.choices[0]!.consequences).toEqual({});
  });

  it('resolves a declared-odds choice and reports how it went', async () => {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const repo = new PrismaEventRepository(db.prisma);
    // A one-event catalog so the gamble is guaranteed to come up.
    const gambleDefinition = {
      id: 'test-gamble',
      category: 'FOOTBALL',
      title: 'Il rigore della vita',
      descriptionTemplate: 'Tocca a te dal dischetto.',
      trigger: {},
      weight: 1,
      cooldownWeeks: 0,
      choices: [
        {
          key: 'shoot',
          label: 'Vai a batterlo',
          consequences: { stress: 5 },
          gamble: {
            successChance: 0.6,
            successLabel: 'Rete: lo stadio esplode.',
            failureLabel: 'Parato. Silenzio.',
            success: { reputation: 40 },
            failure: { reputation: -30, morale: -8 },
          },
        },
      ],
    };
    const deps = { repository: repo, definitions: [gambleDefinition] };
    const game = await createNewGame({ repository: saveRepo }, newGame);
    const before = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });

    const event = await generateWeeklyEvent(deps, { saveGameId: game.save.id });
    expect(event!.choices[0]!.gamble!.successChance).toBe(0.6);

    const result = await resolvePendingEvent(deps, {
      saveGameId: game.save.id,
      gameEventId: event!.gameEventId,
      choiceKey: 'shoot',
    });
    expect(result!.gamble).not.toBeNull();
    const { succeeded, outcomeLabel } = result!.gamble!;
    expect(outcomeLabel).toBe(
      succeeded ? 'Rete: lo stadio esplode.' : 'Parato. Silenzio.',
    );

    // The branch that was reported is the branch that was applied, and the
    // choice's own price applies either way.
    const after = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(after.stress).toBe(before.stress + 5);
    expect(after.reputation).toBe(
      Math.max(0, before.reputation + (succeeded ? 40 : -30)),
    );
    // The story of the outcome is kept with the event, not just returned once.
    const stored = await db.prisma.gameEvent.findUniqueOrThrow({
      where: { id: event!.gameEventId },
    });
    expect((stored.payload as { outcome?: string }).outcome).toBe(outcomeLabel);
    expect(stored.status).toBe('RESOLVED');
  });
});
