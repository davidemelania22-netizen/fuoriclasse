import type { ShopItem } from '@football-life/shared';
import { SHOP_ITEMS } from '@football-life/game-data';
import type { FinanceRepository } from '../repositories/finance-repository';
import type { ShopRepository } from '../repositories/shop-repository';

export function listShopItems(): readonly ShopItem[] {
  return SHOP_ITEMS;
}

export interface ShopDeps {
  shopRepository: ShopRepository;
  financeRepository: FinanceRepository;
}

export type BuyItemResult =
  | { status: 'ok'; balance: number; item: ShopItem }
  | { status: 'insufficient'; balance: number; price: number }
  | { status: 'item-not-found' }
  | { status: 'save-not-found' };

export async function buyItem(
  deps: ShopDeps,
  input: { saveGameId: string; itemKey: string },
): Promise<BuyItemResult> {
  const item = SHOP_ITEMS.find((candidate) => candidate.key === input.itemKey);
  if (!item) return { status: 'item-not-found' };

  const balance = await deps.financeRepository.getBalance(input.saveGameId);
  if (balance === null) return { status: 'save-not-found' };
  if (balance < item.price) {
    return { status: 'insufficient', balance, price: item.price };
  }

  const newBalance = await deps.shopRepository.applyPurchase({
    saveGameId: input.saveGameId,
    price: item.price,
    description: `Acquisto: ${item.name}`,
    effects: item.effects,
  });
  if (newBalance === null) return { status: 'save-not-found' };

  return { status: 'ok', balance: newBalance, item };
}
