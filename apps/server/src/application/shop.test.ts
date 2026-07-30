import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NewGameInput } from '@football-life/shared';
import { SHOP_ITEMS } from '@football-life/game-data';
import { PrismaSaveGameRepository } from '../repositories/prisma-save-game-repository';
import { PrismaShopRepository } from '../repositories/prisma-shop-repository';
import { PrismaFinanceRepository } from '../repositories/prisma-finance-repository';
import { createTestDatabase, type TestDatabase } from '../test/test-db';
import { createNewGame } from './create-new-game';
import { buyItem } from './shop';

const newGame: NewGameInput = {
  name: 'Shop Test',
  player: {
    firstName: 'Compra',
    lastName: 'Tutto',
    nationalityId: 'IT',
    primaryPosition: 'FW',
    preferredFoot: 'RIGHT',
  },
};

describe('shop purchases', () => {
  let db: TestDatabase;

  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.cleanup();
  });

  async function setup(balance: number) {
    const saveRepo = new PrismaSaveGameRepository(db.prisma);
    const game = await createNewGame({ repository: saveRepo }, newGame);
    // Top the wallet up so any item in the catalogue is affordable.
    await db.prisma.financialTransaction.create({
      data: {
        saveGameId: game.save.id,
        playerId: game.player.id,
        occurredAt: new Date(game.save.currentDate),
        type: 'OTHER',
        amount: balance,
        description: 'Test funds',
      },
    });
    const deps = {
      shopRepository: new PrismaShopRepository(db.prisma),
      financeRepository: new PrismaFinanceRepository(db.prisma),
    };
    return { game, deps };
  }

  it('adds fame on the 0-10000 scale instead of cutting it down to 100', async () => {
    const { game, deps } = await setup(500_000);
    // A player who has already built a name: the old code clamped popularity
    // to 100, so buying an image item made them LESS famous.
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { popularity: 900, reputation: 1_200 },
    });

    const agency = SHOP_ITEMS.find((item) => item.key === 'pr-agency')!;
    const result = await buyItem(deps, {
      saveGameId: game.save.id,
      itemKey: agency.key,
    });
    expect(result.status).toBe('ok');

    const after = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(after.popularity).toBe(900 + agency.effects.popularity!);
    expect(after.reputation).toBe(1_200 + agency.effects.reputation!);
  });

  it('keeps wellbeing stats inside 0-100', async () => {
    const { game, deps } = await setup(500_000);
    await db.prisma.player.update({
      where: { id: game.player.id },
      data: { happiness: 96, stress: 3 },
    });

    const holiday = SHOP_ITEMS.find((item) => item.key === 'short-holiday')!;
    await buyItem(deps, {
      saveGameId: game.save.id,
      itemKey: holiday.key,
    });

    const after = await db.prisma.player.findUniqueOrThrow({
      where: { id: game.player.id },
    });
    expect(after.happiness).toBe(100);
    expect(after.stress).toBe(0);
  });

  it('charges the wallet and refuses what the player cannot afford', async () => {
    const { game, deps } = await setup(5_000);
    const jet = SHOP_ITEMS.find((item) => item.key === 'private-jet')!;
    const refused = await buyItem(deps, {
      saveGameId: game.save.id,
      itemKey: jet.key,
    });
    expect(refused.status).toBe('insufficient');

    const cheap = SHOP_ITEMS.find((item) => item.key === 'noise-headphones')!;
    const bought = await buyItem(deps, {
      saveGameId: game.save.id,
      itemKey: cheap.key,
    });
    expect(bought.status).toBe('ok');
    if (bought.status === 'ok') {
      expect(bought.balance).toBe(5_000 + 25_000 - cheap.price);
    }
  });

  it('every item in the catalogue can actually be bought', async () => {
    const { game, deps } = await setup(3_000_000);
    for (const item of SHOP_ITEMS) {
      const result = await buyItem(deps, {
        saveGameId: game.save.id,
        itemKey: item.key,
      });
      expect(result.status, item.key).toBe('ok');
    }
  });
});
