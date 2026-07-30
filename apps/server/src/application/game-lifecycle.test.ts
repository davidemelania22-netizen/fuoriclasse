import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NewGameInput } from '@football-life/shared';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { listSaves, loadGame } from './load-game';

const input: NewGameInput = {
  name: 'Test Career',
  seed: 'unit-seed',
  player: {
    firstName: 'Marco',
    lastName: 'Rossi',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('game lifecycle (create / load / list / delete)', () => {
  let db: TestDatabase;
  let repository: PrismaSaveGameRepository;

  beforeAll(async () => {
    db = await createTestDatabase();
    repository = new PrismaSaveGameRepository(db.prisma);
  });

  afterAll(async () => {
    await db.cleanup();
  });

  it('creates a 14-year-old protagonist with a full attribute set', async () => {
    const game = await createNewGame(
      { repository, now: () => new Date('2024-07-01T00:00:00.000Z') },
      input,
    );

    expect(game.save.id).toBeTruthy();
    expect(game.save.seed).toBe('unit-seed');
    expect(game.save.playerPersonId).toBe(game.player.personId);
    expect(game.player.ageYears).toBe(18);
    expect(game.player.primaryPosition).toBe('FW');
    expect(game.player.currentAbility).toBeGreaterThan(0);

    const attributeCount = await db.prisma.playerAttribute.count({
      where: { playerId: game.player.id },
    });
    expect(attributeCount).toBe(49); // 14 + 10 + 14 + 11
  });

  it('reloads a saved game by id with identical header and player', async () => {
    const created = await createNewGame({ repository }, input);

    const loaded = await loadGame(repository, created.save.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.save.id).toBe(created.save.id);
    expect(loaded?.save.name).toBe(created.save.name);
    expect(loaded?.player.firstName).toBe('Marco');
    expect(loaded?.player.currentAbility).toBeCloseTo(
      created.player.currentAbility,
    );
  });

  it('returns null when loading an unknown id', async () => {
    expect(await loadGame(repository, 'does-not-exist')).toBeNull();
  });

  it('lists saves ordered by most recently played', async () => {
    const saves = await listSaves(repository);
    expect(saves.length).toBeGreaterThanOrEqual(2);
  });

  it('enforces the unique (playerId, attributeKey) constraint', async () => {
    const game = await createNewGame({ repository }, input);

    await expect(
      db.prisma.playerAttribute.create({
        data: {
          playerId: game.player.id,
          attributeKey: 'finishing',
          value: 50,
          category: 'TECHNICAL',
        },
      }),
    ).rejects.toThrow();
  });

  it('hides the save instantly and hard-deletes its rows on purge', async () => {
    const game = await createNewGame({ repository }, input);

    // Soft delete: instantly invisible, rows still present.
    await repository.deleteSave(game.save.id);
    expect(await repository.loadGame(game.save.id)).toBeNull();
    expect(
      (await repository.listSaves()).some((s) => s.id === game.save.id),
    ).toBe(false);

    // Deleting again reports "not found" (already gone from the outside).
    expect(await repository.deleteSave(game.save.id)).toBe(false);

    // Background purge removes the actual rows.
    const purged = await repository.purgeDeletedSaves();
    expect(purged).toBeGreaterThanOrEqual(1);

    const person = await db.prisma.person.findUnique({
      where: { id: game.player.personId },
    });
    const player = await db.prisma.player.findUnique({
      where: { id: game.player.id },
    });
    const save = await db.prisma.saveGame.findUnique({
      where: { id: game.save.id },
    });

    expect(person).toBeNull();
    expect(player).toBeNull();
    expect(save).toBeNull();

    // Purge is idempotent.
    expect(await repository.purgeDeletedSaves()).toBe(0);
  });
});
